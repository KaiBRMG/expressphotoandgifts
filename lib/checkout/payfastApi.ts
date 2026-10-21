import "server-only";

import { createHash } from "node:crypto";

import { shopTimestamp } from "@/lib/shopTime";
import { payfastCredentials, pfEncode } from "./payfast";

/**
 * PayFast's server-to-server API (api.payfast.co.za, "API Ref" in its docs):
 * read only, for the admin. Transaction history, a card payment's status, and
 * a payment's refunds. Nothing here moves money.
 *
 * Signed unlike a payment: every header (merchant-id, version, timestamp),
 * body and query field, and the passphrase, sorted alphabetically, URL-encoded
 * as PHP does, joined with "&" and MD5'd. In the sandbox the same host takes
 * `?testing=true`, which is left out of the signature.
 */

const HOST = "https://api.payfast.co.za";

export type ApiFailure = { ok: false; reason: "not-set-up" | "refused" | "rate-limited" | "unreachable" | "not-found"; message: string };
export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

const signature = (fields: Record<string, string>, passphrase: string) =>
  createHash("md5")
    .update(
      Object.entries({ ...fields, passphrase })
        .filter(([, v]) => v !== "")
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${k}=${pfEncode(v)}`)
        .join("&"),
    )
    .digest("hex");

/** One signed GET, and its body read as JSON when it is JSON. */
async function get(path: string, query: Record<string, string> = {}): Promise<ApiResult<unknown>> {
  const c = payfastCredentials();
  if (!c) return { ok: false, reason: "not-set-up", message: "PayFast isn’t set up: the merchant ID, key and passphrase are needed." };
  const headers = { "merchant-id": c.merchantId, version: "v1", timestamp: shopTimestamp() };
  const params = new URLSearchParams(query);
  if (c.sandbox) params.set("testing", "true");
  const url = `${HOST}${path}${params.size ? `?${params}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { ...headers, signature: signature({ ...headers, ...query }, c.passphrase) },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, reason: "unreachable", message: "PayFast couldn’t be reached. Try again in a few minutes." };
  }
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {}
  if (res.ok) return { ok: true, data: body };

  const said = (body as { data?: { message?: unknown } })?.data?.message;
  const message = typeof said === "string" && said ? said : `PayFast answered ${res.status}.`;
  if (res.status === 429) return { ok: false, reason: "rate-limited", message: "PayFast asked us to slow down. Try again in a few minutes." };
  if (res.status === 401) return { ok: false, reason: "refused", message: `PayFast refused the shop’s API request: ${message} Check the merchant ID and passphrase.` };
  if (res.status === 404) return { ok: false, reason: "not-found", message };
  return { ok: false, reason: res.status >= 500 ? "unreachable" : "refused", message };
}

/** The `data.response` PayFast wraps most answers in. */
const responseOf = (body: unknown) => (body as { data?: { response?: unknown } })?.data?.response;

/* ---- Transaction history ---------------------------------------------- */

/** One row of PayFast's transaction history. Amounts in cents; a debit is negative. */
export type HistoryRow = {
  /** "2026-10-20 22:12:02", the shop's time, as PayFast writes it. */
  date: string;
  /** "FUNDS_RECEIVED", a refund, a payout, a fee… as PayFast names it. */
  type: string;
  sign: string;
  party: string;
  name: string;
  funding: string;
  gross: number;
  fee: number;
  net: number;
  /** Our `m_payment_id`: an attempt ID for checkout payments, blank for anything made elsewhere. */
  attempt: string;
  pfPaymentId: string;
};

/** Splits CSV with quoted fields ("22,574.02", "Test User 01"), doubled quotes inside them, and CRLF or LF rows. */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => {
    row.push(field);
    field = "";
  };
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") endField();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      endField();
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) {
    endField();
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const cents = (s: string) => {
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/** Reads the history CSV by its own header, so a column PayFast adds or moves doesn't shift the rest. */
export function readHistory(csv: string): HistoryRow[] {
  const [head, ...rows] = parseCsv(csv);
  if (!head) return [];
  const at = (name: string) => head.findIndex((h) => h.trim().toLowerCase() === name);
  const col = { date: at("date"), type: at("type"), sign: at("sign"), party: at("party"), name: at("name"), funding: at("funding type"), gross: at("gross"), fee: at("fee"), net: at("net"), m: at("m payment id"), pf: at("pf payment id") };
  const f = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  return rows.map((r) => ({
    date: f(r, col.date),
    type: f(r, col.type),
    sign: f(r, col.sign),
    party: f(r, col.party),
    name: f(r, col.name),
    funding: f(r, col.funding),
    gross: cents(f(r, col.gross)),
    fee: cents(f(r, col.fee)),
    net: cents(f(r, col.net)),
    attempt: f(r, col.m),
    pfPaymentId: f(r, col.pf),
  }));
}

/** Every transaction between two dates (YYYY-MM-DD, both included), up to PayFast's 1000 a call, paged past that. */
export async function transactionHistory(from: string, to: string): Promise<ApiResult<HistoryRow[]>> {
  const all: HistoryRow[] = [];
  for (let offset = 0; offset < 10_000; offset += 1000) {
    const got = await get("/transactions/history", { from, to, limit: "1000", offset: String(offset) });
    if (!got.ok) return got;
    // The CSV arrives bare, or as `response` / `data.response` in JSON, depending on the endpoint's mood.
    const body = got.data;
    const csv = typeof body === "string" ? body : (body as { response?: unknown }).response ?? responseOf(body);
    if (typeof csv !== "string") return { ok: false, reason: "refused", message: "PayFast’s transaction history came back in a shape the shop can’t read." };
    const page = readHistory(csv);
    all.push(...page);
    if (page.length < 1000) break;
  }
  return { ok: true, data: all };
}

/* ---- One card payment --------------------------------------------------- */

/** PayFast's own word on a card payment. `amount` in cents. */
export type CardStatus = { status: string; amount: number | null; bankCode: string; bankMessage: string };

export async function cardPayment(pfPaymentId: string): Promise<ApiResult<CardStatus>> {
  if (!/^\d+$/.test(pfPaymentId)) return { ok: false, reason: "not-found", message: "That isn’t a PayFast payment ID." };
  const got = await get(`/process/query/${pfPaymentId}`);
  if (!got.ok) return got.reason === "not-found" ? { ...got, message: "PayFast has no card payment by that ID. It may have been paid another way, such as EFT." } : got;
  const r = responseOf(got.data) as { status?: unknown; amount?: unknown; cc_status?: unknown; cc_message?: unknown } | undefined;
  if (!r || typeof r !== "object") return { ok: false, reason: "not-found", message: "PayFast had nothing to say about that payment. It may not be a card payment." };
  return {
    ok: true,
    data: {
      status: String(r.status ?? ""),
      amount: Number.isFinite(Number(r.amount)) && r.amount !== null && r.amount !== "" ? Number(r.amount) : null,
      bankCode: String(r.cc_status ?? ""),
      bankMessage: String(r.cc_message ?? ""),
    },
  };
}

/* ---- A payment's refunds ------------------------------------------------ */

/** What's left to refund on a payment, and each refund made against it. Cents; refunds negative. */
export type PaymentRefunds = { available: number | null; refunds: { at: string; amount: number; type: string }[] };

export async function paymentRefunds(pfPaymentId: string): Promise<ApiResult<PaymentRefunds>> {
  if (!/^\d+$/.test(pfPaymentId)) return { ok: false, reason: "not-found", message: "That isn’t a PayFast payment ID." };
  const got = await get(`/refunds/${pfPaymentId}`);
  // PayFast answers 404 "Failed" for a payment nothing has been refunded on.
  if (!got.ok) return got.reason === "not-found" ? { ok: true, data: { available: null, refunds: [] } } : got;
  const r = responseOf(got.data) as { available_balance?: unknown; transactions?: unknown } | undefined;
  const list = Array.isArray(r?.transactions) ? (r!.transactions as { amount?: unknown; date?: unknown; type?: unknown }[]) : [];
  return {
    ok: true,
    data: {
      available: Number.isFinite(Number(r?.available_balance)) ? Number(r!.available_balance) : null,
      refunds: list
        .filter((t) => /refund/i.test(String(t.type ?? "")))
        .map((t) => ({ at: String(t.date ?? ""), amount: Number(t.amount) || 0, type: String(t.type ?? "") })),
    },
  };
}

/* ---- PayFast's status page (public, unsigned) --------------------------- */

/** A payment service PayFast reports as not working normally, in its own words. */
export type Degraded = { name: string; status: string };

/** What PayFast's status page says is degraded or down right now, and any incident under way. Null when all is well, or it can't be read. */
export type PayfastStatus = { degraded: Degraded[]; incidents: string[] };

export async function payfastStatus(): Promise<PayfastStatus | null> {
  try {
    const res = await fetch("https://status.payfast.io/api/v2/summary.json", { next: { revalidate: 300 }, signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const s = (await res.json()) as {
      components?: { id?: string; name?: string; status?: string; group?: boolean; group_id?: string | null }[];
      incidents?: { name?: string; status?: string }[];
    };
    // A bank's name alone repeats across groups ("Nedbank" under Instant EFT and elsewhere), so each is named with its group.
    // Group names nest ("Payfast Aggregation: Instant EFT"); the last part is the service a customer knows.
    const groups = new Map((s.components ?? []).filter((c) => c.group && c.id && c.name).map((c) => [c.id!, c.name!.split(/:{1,2} /).at(-1)!]));
    const seen = new Set<string>();
    const degraded = (s.components ?? [])
      .filter((c) => !c.group && c.status && c.status !== "operational" && c.name)
      .map((c) => {
        const own = c.name!.replace(/^Payments :: /, "");
        const group = c.group_id ? groups.get(c.group_id) : undefined;
        return { name: group && group !== own ? `${group}: ${own}` : own, status: c.status!.replace(/_/g, " ") };
      })
      .filter((d) => !seen.has(d.name) && seen.add(d.name));
    const incidents = (s.incidents ?? []).filter((i) => i.status !== "resolved" && i.status !== "postmortem" && i.name).map((i) => i.name!);
    return degraded.length || incidents.length ? { degraded, incidents } : null;
  } catch {
    return null;
  }
}
