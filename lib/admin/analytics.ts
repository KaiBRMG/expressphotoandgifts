import "server-only";

import { countingSince, funnelDays } from "@/lib/analytics";
import { getCategories, getProducts } from "@/lib/catalog/queries";
import { orders } from "@/lib/checkout/orders";
import type { Order, Refund } from "@/lib/checkout/order";
import { courierReady } from "@/lib/checkout/courier";
import { payfastReady } from "@/lib/checkout/payfast";
import { db } from "@/lib/firebase";
import { FUNNEL_STEPS, type FunnelDay } from "@/lib/funnel";
import { daysIn, monthBounds, shiftMonth, shopDate, toShopLocal } from "@/lib/shopTime";
import { courierMonth } from "./courier";
import { monthLedger, monthRange } from "./payments";
import { monthTraffic, type TrafficRead } from "./vercel";
import { toCsv } from "./csv";

/**
 * A month of the online shop, for the owner's Analytics page. Money is on a
 * cash basis in the shop's time: a sale counts on the day it was paid, a
 * refund on the day it was recorded. Prices are VAT inclusive, as the shop
 * charges them. What PayFast and The Courier Guy took is read live from
 * them; when either can't be read, its step is null and says why, and
 * nothing is guessed in its place.
 */

/** A cost read from PayFast or TCG: cents, or why it isn't known. */
export type Cost = { ok: true; cents: number; note?: string } | { ok: false; why: string };

export type Revenue = {
  orders: number;
  /** The lines at the catalogue's prices, before any deal. */
  catalogue: number;
  /** Everything campaigns took off: price deals, item deals and spend thresholds. */
  deals: number;
  delivery: number;
  /** What customers paid: catalogue less deals plus delivery. */
  paid: number;
  refunds: number;
  refunded: number;
  /** Paid less refunds: the headline. */
  net: number;
  fees: Cost;
  courier: Cost;
  /** Net less fees and courier, or null while either is unknown. */
  kept: number | null;
  average: number | null;
  /** Orders collected and couriered, with what they paid. */
  collect: { orders: number; paid: number };
  shipped: { orders: number; paid: number };
  /** Day by day, the month's net so far (null for days still to come), beside the month before. */
  pace: { day: number; now: number | null; before: number | null }[];
  before: { month: string; net: number; orders: number; atSameDay: number };
};

export type SalesRow = { key: string; name: string; units: number; revenue: number };

export type Sales = {
  categories: SalesRow[];
  products: (SalesRow & { views: number; carts: number })[];
  sizes: SalesRow[];
  campaigns: { id: string; name: string; given: number; orders: number }[];
};

export type Funnel = {
  /** When the browser's counters started, or null before they ever ran. */
  since: string | null;
  steps: { key: string; label: string; count: number }[];
  /** Orders whose Pay was pressed in the month and never paid. */
  unpaid: { orders: number; value: number };
  /** Searches that found nothing, most asked first. */
  misses: { q: string; n: number }[];
};

export type Customers = {
  people: number;
  returning: number;
  accounts: number;
  gifts: number;
  provinces: { name: string; orders: number }[];
};

/** A median time in hours over `n` orders, or null with none to go on. */
export type Span = { hours: number; n: number } | null;

export type Turnaround = {
  ready: Span;
  collected: Span;
  sent: Span;
  delivered: Span;
};

export type Report = {
  month: string;
  /** Today's day of the month when the month is this one; its length otherwise. */
  today: number;
  revenue: Revenue;
  sales: Sales;
  funnel: Funnel;
  customers: Customers;
  turnaround: Turnaround;
  traffic: TrafficRead;
};

/** Orders paid from `start` up to `end`, oldest first; with `fields`, only those fields are read. */
async function paidBetween(start: string, end: string, fields?: string[]): Promise<Order[]> {
  const q = orders().where("paidAt", ">=", start).where("paidAt", "<", end).orderBy("paidAt");
  return (await (fields ? q.select(...fields) : q).get()).docs.map((d) => d.data() as Order);
}

/**
 * Every refund recorded from `start` up to `end`, with its order. A refund is
 * recorded through `changeOrder`, which moves `updatedAt`, so every order
 * refunded since `start` is among those updated since.
 */
async function refundsBetween(start: string, end: string) {
  const snap = await orders().where("updatedAt", ">=", start).select("ref", "contact", "fulfilment.method", "refunds").get();
  return snap.docs.flatMap((d) => {
    const order = d.data() as Pick<Order, "ref" | "contact" | "fulfilment" | "refunds">;
    return (order.refunds ?? []).filter((r) => r.at >= start && r.at < end).map((refund) => ({ order, refund }));
  });
}

const catalogueValue = (o: Order) => o.lines.reduce((n, l) => n + (l.base ?? l.price) * l.quantity, 0);

/** What campaigns took off an order: its lines at catalogue prices and its delivery, less what was paid. */
const dealsOf = (o: Order) => catalogueValue(o) + o.delivery - o.total;

/** A source that isn't set up, in the shape its reader answers with. */
const unset = (message: string) => Promise.resolve({ ok: false as const, message });

/** Each order's paid total by its SAST day of the month, less each refund on its day. */
function dailyNet(length: number, paid: Pick<Order, "paidAt" | "total">[], refunds: Refund[]) {
  const by = new Array<number>(length + 1).fill(0);
  const dayOf = (iso: string) => Number(shopDate(Date.parse(iso)).slice(8, 10));
  for (const o of paid) by[dayOf(o.paidAt!)] += o.total;
  for (const r of refunds) by[dayOf(r.at)] -= r.amount;
  return by;
}

const cumulative = (by: number[]) => {
  const out: number[] = [];
  let run = 0;
  for (let d = 1; d < by.length; d++) out[d] = run += by[d];
  return out;
};

function median(values: number[]): Span {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return {
    hours: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2,
    n: s.length,
  };
}

const hoursBetween = (from: string, to: string | undefined) => (to ? (Date.parse(to) - Date.parse(from)) / 3_600_000 : null);

const sum = (days: FunnelDay[], key: (typeof FUNNEL_STEPS)[number]) => days.reduce((n, d) => n + (d[key] ?? 0), 0);

const tally = (days: FunnelDay[], field: "views" | "carts" | "misses") => {
  const out = new Map<string, number>();
  for (const d of days) for (const [k, n] of Object.entries(d[field] ?? {})) out.set(k, (out.get(k) ?? 0) + n);
  return out;
};

const plain = (e: string) => e.trim().toLowerCase();

/** How many of these customers had a paid order before `start`; `in` takes thirty emails a query. */
async function returningOf(paid: Order[], start: string): Promise<number> {
  const emails = [...new Set(paid.map((o) => o.contact.email))];
  const batches = Array.from({ length: Math.ceil(emails.length / 30) }, (_, i) => emails.slice(i * 30, i * 30 + 30));
  const snaps = await Promise.all(batches.map((b) => orders().where("contact.email", "in", b).select("contact.email", "paidAt").get()));
  const back = snaps.flatMap((s) => s.docs.map((d) => d.data() as Pick<Order, "contact" | "paidAt">)).filter((o) => o.paidAt && o.paidAt < start);
  return new Set(back.map((o) => plain(o.contact.email))).size;
}

/** Each product's category, from the cached catalogue; products no longer on sale are read for their category alone. */
async function categoriesOf(paid: Order[]): Promise<Map<string, string>> {
  const of = new Map((await getProducts()).map((p) => [p.slug, p.categoryId]));
  const missing = [...new Set(paid.flatMap((o) => o.lines.map((l) => l.slug)))].filter((s) => !of.has(s));
  if (missing.length) {
    const snaps = await db().getAll(...missing.map((s) => db().collection("products").doc(s)), { fieldMask: ["categoryId"] });
    for (const d of snaps) if (d.exists) of.set(d.id, d.get("categoryId"));
  }
  return of;
}

const STEP_LABEL: Record<string, string> = {
  view: "Looked at a product",
  cart: "Added to cart",
  checkout: "Started checkout",
  details: "Reached their details",
  pay: "Pressed Pay",
  paid: "Paid",
};

export async function monthReport(month: string): Promise<Report> {
  const before = shiftMonth(month, -1);
  const now = monthBounds(month);
  const last = monthBounds(before);
  const range = monthRange(month);
  const length = daysIn(month);
  const lengthBefore = daysIn(before);
  const current = shopDate().slice(0, 7) === month;
  const today = current ? Number(shopDate().slice(8, 10)) : length;

  // The month's paid orders feed the reads that depend on them, which then run alongside PayFast, TCG and Vercel.
  const paidRead = paidBetween(now.start, now.end);
  const [paid, paidBefore, both, placed, days, since, categoryOf, categories, returning, ledger, tcg, traffic] = await Promise.all([
    paidRead,
    paidBetween(last.start, last.end, ["paidAt", "total"]),
    refundsBetween(last.start, now.end),
    orders().where("createdAt", ">=", now.start).where("createdAt", "<", now.end).select("status", "total").get(),
    funnelDays(range.from, range.to),
    countingSince(),
    paidRead.then(categoriesOf),
    getCategories(),
    paidRead.then((p) => returningOf(p, now.start)),
    payfastReady() ? monthLedger(month) : unset("PayFast isn’t set up."),
    courierReady() ? courierMonth(month) : unset("The Courier Guy isn’t set up."),
    monthTraffic(range.from, range.to, !current),
  ]);

  /* ---- Revenue ---- */

  const refunds = both.filter((x) => x.refund.at >= now.start).map((x) => x.refund);
  const refundsBefore = both.filter((x) => x.refund.at < now.start).map((x) => x.refund);

  const total = (os: Order[], f: (o: Order) => number) => os.reduce((n, o) => n + f(o), 0);
  const catalogue = total(paid, catalogueValue);
  const delivery = total(paid, (o) => o.delivery);
  const paidSum = total(paid, (o) => o.total);
  const refundSum = refunds.reduce((n, r) => n + r.amount, 0);
  const net = paidSum - refundSum;

  const fees: Cost = ledger.ok ? { ok: true, cents: -ledger.data.payments.fee } : { ok: false, why: ledger.message };
  const courier: Cost = tcg.ok
    ? {
        ok: true,
        cents: tcg.data.charged,
        ...(tcg.data.billed
          ? {}
          : {
              note: "TCG’s billing couldn’t be read, so these are its booking prices.",
            }),
      }
    : { ok: false, why: tcg.message };

  const daily = cumulative(dailyNet(length, paid, refunds));
  const dailyBefore = cumulative(dailyNet(lengthBefore, paidBefore, refundsBefore));
  const pace = Array.from({ length }, (_, i) => {
    const day = i + 1;
    return {
      day,
      now: day <= today ? daily[day] : null,
      before: day <= lengthBefore ? dailyBefore[day] : null,
    };
  });
  const netBefore = dailyBefore[lengthBefore] ?? 0;

  const by = (method: "collect" | "courier") => {
    const os = paid.filter((o) => o.fulfilment.method === method);
    return { orders: os.length, paid: total(os, (o) => o.total) };
  };

  const revenue: Revenue = {
    orders: paid.length,
    catalogue,
    deals: total(paid, dealsOf),
    delivery,
    paid: paidSum,
    refunds: refundSum,
    refunded: refunds.length,
    net,
    fees,
    courier,
    kept: fees.ok && courier.ok ? net - fees.cents - courier.cents : null,
    average: paid.length ? Math.round(paidSum / paid.length) : null,
    collect: by("collect"),
    shipped: by("courier"),
    pace,
    before: {
      month: before,
      net: netBefore,
      orders: paidBefore.length,
      atSameDay: dailyBefore[Math.min(today, lengthBefore)] ?? 0,
    },
  };

  /* ---- Sales ---- */

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const views = tally(days, "views");
  const carts = tally(days, "carts");

  /** The month's lines added up under whatever `by` names them. */
  const group = (by: (l: Order["lines"][number]) => { key: string; name: string }) => {
    const rows = new Map<string, SalesRow>();
    for (const o of paid)
      for (const l of o.lines) {
        const { key, name } = by(l);
        const row = rows.get(key) ?? { key, name, units: 0, revenue: 0 };
        row.units += l.quantity;
        row.revenue += l.price * l.quantity;
        rows.set(key, row);
      }
    return [...rows.values()].sort((a, b) => b.revenue - a.revenue || b.units - a.units);
  };

  const campaignRows = new Map<string, Sales["campaigns"][number]>();
  for (const o of paid) {
    const seen = new Set<string>();
    for (const s of o.savings ?? []) {
      const row = campaignRows.get(s.campaign) ?? { id: s.campaign, name: s.name, given: 0, orders: 0 };
      row.given += s.amount;
      if (!seen.has(s.campaign)) row.orders++;
      seen.add(s.campaign);
      campaignRows.set(s.campaign, row);
    }
  }

  const sales: Sales = {
    categories: group((l) => {
      const id = categoryOf.get(l.slug) ?? "";
      return { key: id || "other", name: categoryName.get(id) ?? "No longer listed" };
    }),
    products: group((l) => ({ key: l.slug, name: l.name }))
      .slice(0, 10)
      .map((r) => ({ ...r, views: views.get(r.key) ?? 0, carts: carts.get(r.key) ?? 0 })),
    sizes: group((l) => ({ key: l.sku, name: l.variant ? `${l.name}, ${l.variant}` : l.name })).slice(0, 8),
    campaigns: [...campaignRows.values()].sort((a, b) => b.given - a.given),
  };

  /* ---- Funnel ---- */

  const placedRows = placed.docs.map((d) => d.data() as Pick<Order, "status" | "total">);
  const unpaid = placedRows.filter((o) => o.status !== "paid");
  const funnel: Funnel = {
    since,
    steps: [
      ...FUNNEL_STEPS.map((k) => ({
        key: k,
        label: STEP_LABEL[k],
        count: sum(days, k),
      })),
      { key: "pay", label: STEP_LABEL.pay, count: placedRows.length },
      {
        key: "paid",
        label: STEP_LABEL.paid,
        count: placedRows.length - unpaid.length,
      },
    ],
    unpaid: {
      orders: unpaid.length,
      value: unpaid.reduce((n, o) => n + o.total, 0),
    },
    misses: [...tally(days, "misses")]
      .map(([q, n]) => ({ q, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 10),
  };

  /* ---- Customers ---- */

  const provinces = new Map<string, number>();
  for (const o of paid) if (o.fulfilment.method === "courier" && o.fulfilment.address.province) provinces.set(o.fulfilment.address.province, (provinces.get(o.fulfilment.address.province) ?? 0) + 1);
  const customers: Customers = {
    people: new Set(paid.map((o) => plain(o.contact.email))).size,
    returning,
    accounts: paid.filter((o) => o.uid).length,
    gifts: paid.filter((o) => o.fulfilment.method === "courier" && o.fulfilment.recipient).length,
    provinces: [...provinces].map(([name, n]) => ({ name, orders: n })).sort((a, b) => b.orders - a.orders),
  };

  /* ---- Turnaround ---- */

  const spans = (f: (o: Order) => number | null) => median(paid.map(f).filter((h): h is number => h !== null && h >= 0));
  const doneBy = (method: Order["fulfilment"]["method"]) => spans((o) => (o.fulfilment.method === method ? hoursBetween(o.paidAt!, o.stagedAt?.done) : null));
  const turnaround: Turnaround = {
    ready: spans((o) => hoursBetween(o.paidAt!, o.stagedAt?.ready)),
    collected: doneBy("collect"),
    sent: doneBy("courier"),
    delivered: spans((o) => hoursBetween(o.paidAt!, o.shipment?.events?.find((e) => e.status === "delivered")?.at)),
  };

  return { month, today, revenue, sales, funnel, customers, turnaround, traffic };
}

/* ---- The spreadsheet ---------------------------------------------------- */

const sast = (iso: string) => toShopLocal(iso).replace("T", " ");
const randsCell = (cents: number) => (cents / 100).toFixed(2);

/** A month's sales and refunds as CSV, one line each, in the order they happened: for the shop's books. */
export async function monthCsv(month: string): Promise<string> {
  const b = monthBounds(month);
  const [paid, refunds, ledger] = await Promise.all([paidBetween(b.start, b.end), refundsBetween(b.start, b.end), payfastReady() ? monthLedger(month) : null]);
  // Each payment's fee as PayFast's history has it, the figure the page's ledger adds up; blank when the history can't be read.
  const feeOf = new Map(ledger?.ok ? ledger.data.rows.map((r) => [r.pfPaymentId, -r.fee]) : []);
  type Line = { at: string; cells: (string | number)[] };
  const who = (o: Pick<Order, "contact">) => [`${o.contact.firstName} ${o.contact.lastName}`, o.contact.email];
  const lines: Line[] = paid.map((o) => ({
    at: o.paidAt!,
    cells: [
      "Sale",
      sast(o.paidAt!),
      o.ref,
      ...who(o),
      o.fulfilment.method,
      randsCell(catalogueValue(o)),
      randsCell(dealsOf(o)),
      randsCell(o.delivery),
      randsCell(o.total),
      "",
      o.payment && feeOf.has(o.payment.pfPaymentId) ? randsCell(feeOf.get(o.payment.pfPaymentId)!) : "",
    ],
  }));
  for (const { order: o, refund: r } of refunds) lines.push({ at: r.at, cells: ["Refund", sast(r.at), o.ref, ...who(o), o.fulfilment.method, "", "", "", "", randsCell(r.amount), ""] });
  lines.sort((a, b) => a.at.localeCompare(b.at));
  const head = ["Type", "Date (SAST)", "Order", "Customer", "Email", "Collect or courier", "Items at catalogue prices", "Deals", "Delivery", "Paid", "Refunded", "PayFast fee"];
  return toCsv([head, ...lines.map((l) => l.cells)]);
}
