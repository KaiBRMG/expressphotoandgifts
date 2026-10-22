import "server-only";

import type { UserRecord } from "firebase-admin/auth";
import { cache } from "react";

import { customerKey } from "@/lib/campaigns";
import { addressLine, contactName } from "@/lib/checkout/details";
import { orders } from "@/lib/checkout/orders";
import { refundedOf, type Order } from "@/lib/checkout/order";
import { allConsent, savedDetails, type Consent, type SavedDetails } from "@/lib/account/auth";
import { auth } from "@/lib/firebase";
import { isStaffEmail } from "@/lib/identity";
import { orderRow, type OrderRow } from "./orders";
import { toCsv } from "./csv";

/**
 * Customers as the admin reads them, always fresh: one per email, every paid
 * order under it and the account (if any) joined to it. An order placed while
 * signed in counts under its account's email, so a customer who checked out
 * with another address is still one customer; two addresses with nothing
 * tying them stay two, since nothing here guesses they are the same person.
 * Accounts with no paid order (the footer's sign-up) are kept for the
 * marketing list. Staff accounts are never customers.
 */

/** One customer as their row in the list shows them. */
export type CustomerRow = {
  /** `customerKey` of the email: what the customer's page is addressed by, so the email stays out of addresses. */
  key: string;
  email: string;
  /** From the latest paid order, or the account's name; "" when neither has one. */
  name: string;
  phone: string;
  /** Paid orders. */
  orders: number;
  /** Cents: paid totals less refunds. */
  spent: number;
  refunded: number;
  /** When the first and latest paid orders were paid; null with none. */
  first: string | null;
  last: string | null;
  account: boolean;
  /** Agreed to marketing email and not withdrawn. */
  marketing: boolean;
  /** Every paid order's number, so a typed number finds its customer. */
  refs: string[];
};

/** Only what the list needs of every paid order; a customer's page reads the rest of theirs. */
type PaidOrder = Pick<Order, "ref" | "contact" | "total" | "refunds" | "paidAt" | "uid">;

type Group = { key: string; email: string; user: UserRecord | null; paid: PaidOrder[] };

/** Every sign-in account that isn't staff's. */
async function customerAccounts(): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let page: string | undefined;
  do {
    const res = await auth().listUsers(1000, page);
    users.push(...res.users);
    page = res.pageToken;
  } while (page);
  return users.filter((u) => u.email && u.customClaims?.admin !== true && !isStaffEmail(u.email));
}

/**
 * Paid orders and accounts, grouped by customer, with every key that finds
 * one: their own, and that of each other email their paid orders were placed
 * with. Once per request, so the list and a customer's page share one read.
 */
const groups = cache(async (): Promise<{ groups: Group[]; byKey: Map<string, Group>; consent: Map<string, Consent> }> => {
  const [paidSnap, users, consent] = await Promise.all([
    orders().where("status", "==", "paid").select("ref", "contact", "total", "refunds", "paidAt", "uid").get(),
    customerAccounts(),
    allConsent(),
  ]);

  const byUid = new Map(users.map((u) => [u.uid, u]));
  const byEmail = new Map<string, Group>();
  const group = (email: string) => {
    let g = byEmail.get(email);
    if (!g) byEmail.set(email, (g = { key: customerKey(email), email, user: null, paid: [] }));
    return g;
  };
  for (const u of users) group(u.email!.toLowerCase()).user = u;
  for (const d of paidSnap.docs) {
    const o = d.data() as PaidOrder;
    // Signed in: the account's email; a guest, or an account since deleted: the email typed at checkout.
    const account = o.uid ? byUid.get(o.uid) : undefined;
    group(account ? account.email!.toLowerCase() : o.contact.email.trim().toLowerCase()).paid.push(o);
  }

  const all = [...byEmail.values()];
  const byKey = new Map(all.map((g) => [g.key, g]));
  for (const g of all) {
    g.paid.sort((a, b) => b.paidAt!.localeCompare(a.paidAt!));
    for (const o of g.paid) {
      const k = customerKey(o.contact.email);
      if (!byKey.has(k)) byKey.set(k, g);
    }
  }
  return { groups: all, byKey, consent };
});

/** The latest paid order's name, or the account's. */
const nameOf = (g: Group) => (g.paid[0] && contactName(g.paid[0].contact)) || g.user?.displayName?.trim() || "";

function toRow(g: Group, consent: Map<string, Consent>): CustomerRow {
  const total = g.paid.reduce((n, o) => n + o.total, 0);
  const refunded = g.paid.reduce((n, o) => n + refundedOf(o), 0);
  return {
    key: g.key,
    email: g.email,
    name: nameOf(g),
    phone: g.paid[0]?.contact.phone ?? "",
    orders: g.paid.length,
    spent: total - refunded,
    refunded,
    first: g.paid.at(-1)?.paidAt ?? null,
    last: g.paid[0]?.paidAt ?? null,
    account: g.user !== null,
    marketing: g.user !== null && consent.get(g.user.uid)?.optedIn === true,
    refs: g.paid.map((o) => o.ref),
  };
}

/** Everyone who has paid, and every account, the latest order first, then accounts by when they were made. */
export async function listCustomers(): Promise<CustomerRow[]> {
  const { groups: all, consent } = await groups();
  const made = (g: Group) => (g.user ? new Date(g.user.metadata.creationTime).toISOString() : "");
  return all
    .sort((a, b) => (b.paid[0]?.paidAt ?? "").localeCompare(a.paid[0]?.paidAt ?? "") || made(b).localeCompare(made(a)))
    .map((g) => toRow(g, consent));
}

/** The opted-in list, for the shop's mailing tool: email, name and when and where they last agreed. */
export async function marketingCsv(): Promise<string> {
  const { groups: all, consent } = await groups();
  const rows = all
    .flatMap((g) => {
      const c = g.user ? consent.get(g.user.uid) : undefined;
      if (!c?.optedIn) return [];
      const agreed = c.history.filter((h) => h.optedIn).at(-1)!;
      return [[g.email, nameOf(g), agreed.at.slice(0, 10), agreed.source]];
    })
    .sort((a, b) => a[0].localeCompare(b[0]));
  return toCsv([["Email", "Name", "Agreed on", "Where"], ...rows]);
}

/* ---- One customer ---------------------------------------------------- */

/** An order of theirs, as their page lists it: its row, and what was in it ("Photo Mug, A4 Print and 2 more"). */
export type CustomerOrder = OrderRow & { what: string };

export type Tally = { key: string; label: string; detail: string | null; count: number; amount: number };

export type CustomerDetail = {
  row: CustomerRow;
  account: { since: string; lastSignIn: string | null; saved: SavedDetails | null } | null;
  /** History newest first. */
  marketing: Consent | null;
  orders: CustomerOrder[];
  /** Names, mobiles and emails their paid orders carried besides the ones shown. */
  also: { names: string[]; phones: string[]; emails: string[] };
  collected: number;
  /** Products by units bought, most first. */
  products: Tally[];
  /** Campaigns by what they saved, most first. `count` is orders. */
  campaigns: Tally[];
  /** Where couriered orders went, most used first. `count` is orders. */
  addresses: Tally[];
  /** Gift recipients the courier delivered to. `count` is orders. */
  recipients: Tally[];
};

function what(lines: Order["lines"]): string {
  const names = [...new Set(lines.map((l) => l.name))];
  if (names.length <= 2) return names.join(" and ");
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/** Adds to a tally by key, keeping the first label it was given (the newest order's). */
function tallyInto(map: Map<string, Tally>, key: string, label: string, detail: string | null, count: number, amount: number) {
  const t = map.get(key);
  if (t) {
    t.count += count;
    t.amount += amount;
  } else map.set(key, { key, label, detail, count, amount });
}

const others = (values: string[], shown: string) => [...new Set(values.filter((v) => v && v.toLowerCase() !== shown.toLowerCase()))];

/**
 * One customer by their key (or the key of another email their paid orders
 * used): the row, their account and its consent record, and every order
 * under their emails or account, unpaid ones too, so a customer asking after
 * an order that never went through is answered here. Null for no one's key.
 */
export const getCustomer = cache(async (key: string): Promise<CustomerDetail | null> => {
  const { byKey, consent } = await groups();
  const g = byKey.get(key);
  if (!g) return null;
  const row = toRow(g, consent);
  const uid = g.user?.uid ?? null;

  // Their orders in full, every status, by the emails they used (Firestore's `in` takes 30) and their account.
  const emails = [...new Set([g.email, ...g.paid.map((o) => o.contact.email.trim().toLowerCase())])];
  const [byEmail, byUid, saved] = await Promise.all([
    orders().where("contact.email", "in", emails.slice(0, 30)).get(),
    uid ? orders().where("uid", "==", uid).get() : null,
    uid ? savedDetails(uid) : null,
  ]);
  // A paid order counts only where the grouping put it (an email's order placed signed in to another account isn't theirs).
  const mine = new Set(row.refs);
  const found = new Map([...byEmail.docs, ...(byUid?.docs ?? [])].map((d) => [d.id, d.data() as Order]));
  const all = [...found.values()].filter((o) => o.status !== "paid" || mine.has(o.ref));
  const paid = all.filter((o) => o.status === "paid");

  const products = new Map<string, Tally>();
  const campaigns = new Map<string, Tally>();
  const addresses = new Map<string, Tally>();
  const recipients = new Map<string, Tally>();
  for (const o of paid.sort((a, b) => b.paidAt!.localeCompare(a.paidAt!))) {
    for (const l of o.lines) tallyInto(products, `${l.slug}/${l.variant ?? ""}`, l.name, l.variant, l.quantity, l.paid ?? l.price * l.quantity);
    // Each campaign counts once an order, however many of its rules applied.
    const seen = new Set<string>();
    for (const s of o.savings ?? []) {
      tallyInto(campaigns, s.campaign, s.name, null, seen.has(s.campaign) ? 0 : 1, s.amount);
      seen.add(s.campaign);
    }
    const f = o.fulfilment;
    if (f.method !== "courier") continue;
    const line = addressLine(f.address);
    tallyInto(addresses, line.toLowerCase(), line, f.address.province, 1, 0);
    if (f.recipient?.name) tallyInto(recipients, `${f.recipient.name}/${f.recipient.phone}`.toLowerCase(), f.recipient.name, f.recipient.phone || null, 1, 0);
  }
  const most = (m: Map<string, Tally>, by: "count" | "amount") => [...m.values()].sort((a, b) => b[by] - a[by] || a.label.localeCompare(b.label));
  const c = uid ? consent.get(uid) : undefined;

  return {
    row,
    account: g.user
      ? {
          since: new Date(g.user.metadata.creationTime).toISOString(),
          lastSignIn: g.user.metadata.lastSignInTime ? new Date(g.user.metadata.lastSignInTime).toISOString() : null,
          saved,
        }
      : null,
    marketing: c ? { optedIn: c.optedIn, history: [...c.history].reverse() } : null,
    orders: all.map((o) => ({ ...orderRow(o), what: what(o.lines) })).sort((a, b) => b.at.localeCompare(a.at)),
    also: {
      names: others(g.paid.map((o) => contactName(o.contact)), row.name),
      phones: others(g.paid.map((o) => o.contact.phone), row.phone),
      emails: others(emails, row.email),
    },
    collected: paid.filter((o) => o.fulfilment.method === "collect").length,
    products: most(products, "count"),
    campaigns: most(campaigns, "amount"),
    addresses: most(addresses, "count"),
    recipients: most(recipients, "count"),
  };
});
