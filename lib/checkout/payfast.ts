import "server-only";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";

import { SHOP } from "@/app/site/data";
import { shopContact } from "@/lib/settings";
import { safeEqual } from "@/lib/secure";
import { receiptPath, type Attempt, type Checkout, type Notice } from "./order";
import { siteUrl } from "./site";

/**
 * PayFast (developers.payfast.co.za): the payment, signed here so the
 * passphrase never leaves the server, and the payment notice (ITN) checked
 * here before an order counts as paid.
 *
 * Settings: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE (the
 * one set in PayFast's dashboard; required, since without it the signature is
 * a hash anyone can work out), PAYFAST_SANDBOX=true for sandbox.payfast.co.za,
 * and PAYFAST_ONSITE=false to always use PayFast's own page instead of its
 * Onsite window. SITE_URL is the public address PayFast returns the customer
 * to and posts notices to; it must be reachable from the internet for notices
 * to arrive.
 */

function config() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY?.trim();
  const passphrase = process.env.PAYFAST_PASSPHRASE?.trim();
  const site = siteUrl();
  if (!merchantId || !merchantKey || !passphrase || !site) return null;
  return {
    merchantId,
    merchantKey,
    passphrase,
    site,
    host: process.env.PAYFAST_SANDBOX === "true" ? "sandbox.payfast.co.za" : "www.payfast.co.za",
    onsite: process.env.PAYFAST_ONSITE !== "false",
  };
}

export const payfastReady = () => config() !== null;

/** Whether payments go to PayFast's sandbox (PAYFAST_SANDBOX=true), where no money moves. */
export const payfastSandbox = () => config()?.host === "sandbox.payfast.co.za";

/** What PayFast's API (`lib/checkout/payfastApi.ts`) signs with: the same merchant and passphrase as payments. */
export function payfastCredentials() {
  const c = config();
  return c ? { merchantId: c.merchantId, passphrase: c.passphrase, sandbox: c.host === "sandbox.payfast.co.za" } : null;
}

/** Whether checkout should offer PayFast's Onsite window. */
export const payfastOnsite = () => config()?.onsite ?? false;

/** Cents as PayFast writes an amount: "123.45". */
export const pfAmount = (cents: number) => (cents / 100).toFixed(2);

/**
 * PHP's urlencode, which PayFast's signature is defined by: upper-case hex,
 * spaces as "+", and !'()*~ encoded too (encodeURIComponent leaves them).
 */
export const pfEncode = (value: string) =>
  encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");

/** Field pairs as PayFast signs them, in the order given. */
const paramString = (fields: [string, string][]) => fields.map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");

/** The MD5 of a parameter string, salted with the passphrase. */
const sign = (params: string, passphrase: string) => createHash("md5").update(`${params}&passphrase=${pfEncode(passphrase)}`).digest("hex");

/** A form POST to PayFast, as its Onsite and validate endpoints take one. */
const postForm = (url: string, body: string) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });


/**
 * Builds the payment for one attempt: the redirect form, and with `onsite`,
 * an Onsite identifier as well. The attempt's ID goes to PayFast as
 * `m_payment_id`, so its notice says exactly which frozen order was paid for.
 * PayFast's field order is fixed (merchant, then customer, then transaction,
 * then options) and never alphabetical; blanks are left out, and values are
 * trimmed, as PayFast signs them.
 */
export async function startPayment(attempt: Attempt, token: string, onsite: boolean): Promise<Checkout | null> {
  const c = config();
  if (!c) return null;
  const { email: shopEmail } = await shopContact();
  const receipt = c.site + receiptPath(attempt.ref, token);

  const fields = (urls: boolean): [string, string][] =>
    (
      [
        ["merchant_id", c.merchantId],
        ["merchant_key", c.merchantKey],
        ...(urls ? [["return_url", receipt], ["cancel_url", `${c.site}/checkout/details?cancelled=1`]] : []),
        ["notify_url", `${c.site}/api/payfast/notify`],
        ["name_first", attempt.contact.firstName],
        ["name_last", attempt.contact.lastName],
        ["email_address", attempt.contact.email],
        ["cell_number", attempt.contact.phone],
        ["m_payment_id", attempt.id],
        ["amount", pfAmount(attempt.total)],
        ["item_name", `${SHOP.name} order ${attempt.ref}`],
        ["email_confirmation", "1"],
        ["confirmation_address", shopEmail],
      ] as [string, string][]
    )
      .map(([k, v]): [string, string] => [k, v.trim()])
      .filter(([, v]) => v !== "");

  const redirect = fields(true);
  redirect.push(["signature", sign(paramString(redirect), c.passphrase)]);

  let uuid: string | null = null;
  if (onsite && c.onsite) {
    // Onsite closes its window and reports back to the page, so it carries no return or cancel address.
    const params = paramString(fields(false));
    try {
      const res = await postForm(`https://${c.host}/onsite/process`, `${params}&signature=${sign(params, c.passphrase)}`);
      const data = (await res.json().catch(() => ({}))) as { uuid?: unknown };
      uuid = typeof data.uuid === "string" ? data.uuid : null;
      if (!uuid) console.error("PayFast Onsite gave no identifier", res.status);
    } catch (e) {
      console.error("PayFast Onsite unreachable", e);
    }
  }

  return {
    action: `https://${c.host}/eng/process`,
    fields: redirect,
    onsite: uuid ? { uuid, engine: `https://${c.host}/onsite/engine.js` } : null,
  };
}

/** An IPv4 address as a number, or null for anything else. */
function ipv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null;
  return parts.reduce((n, p) => n * 256 + Number(p), 0);
}

/** The addresses PayFast says its notices come from (Dev Docs, "Ports and IP Addresses"), as first and last address. */
const PAYFAST_RANGES = (
  [
    ["197.97.145.144", 28],
    ["41.74.179.192", 27],
    ["102.216.36.0", 28],
    ["102.216.36.128", 28],
    ["144.126.193.139", 32],
  ] as const
).map(([first, bits]) => {
  const from = ipv4(first)!;
  return { from, to: from + 2 ** (32 - bits) - 1 };
});

/** The hosts a notice may come from, as PayFast lists them. */
const PAYFAST_HOSTS = ["www.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za", "sandbox.payfast.co.za"];
const HOSTS_FRESH_MS = 10 * 60 * 1000;
let known: { ips: Set<string>; at: number } | null = null;

/**
 * Whether an address is PayFast's: in one of its published ranges, or one its
 * hosts resolve to (the docs give both, and the hosts reach a little past the
 * ranges). The hosts are looked up again every ten minutes, or for an address
 * not seen.
 */
async function fromPayfast(raw: string | null): Promise<boolean> {
  const ip = raw?.replace(/^::ffff:/, "") ?? null;
  if (!ip) return false;
  const n = ipv4(ip);
  if (n !== null && PAYFAST_RANGES.some((r) => n >= r.from && n <= r.to)) return true;
  if (!known || Date.now() - known.at > HOSTS_FRESH_MS || !known.ips.has(ip)) {
    const found = await Promise.all(PAYFAST_HOSTS.map((h) => lookup(h, { all: true }).catch(() => [])));
    known = { ips: new Set(found.flat().map((a) => a.address)), at: Date.now() };
  }
  return known.ips.has(ip);
}

/** PayFast's own word that it sent the notice. */
async function confirmedByPayfast(host: string, params: string): Promise<boolean | "unreachable"> {
  try {
    const res = await postForm(`https://${host}/eng/query/validate`, params);
    if (!res.ok) return "unreachable";
    return (await res.text()).trim() === "VALID";
  } catch {
    return "unreachable";
  }
}

/** The fields only the shop's checkout form carries; a notice never does. */
const CHECKOUT_ONLY = new Set(["merchant_key", "return_url", "cancel_url", "notify_url"]);

/** A notice field as recorded: a value PayFast would send is short, so a long one is cut rather than stored whole. */
const cap = (v: string | undefined) => (v ?? "").slice(0, 100);

export type ReadNotice =
  | { ok: true; notice: Notice }
  /** `signed`: the signature held, so the notice is PayFast's (only it and the shop know the passphrase) and is worth recording; another check failed. */
  | { ok: false; reason: string; signed: false }
  | { ok: false; reason: string; signed: true; notice: Notice; retry?: boolean };

/**
 * Reads a notice's raw body and runs the checks that need no order: the
 * signature over every field posted before it, the merchant, where it came
 * from, and PayFast's own confirmation that it sent it. The amount is checked
 * against the attempt by the caller (`amountMatches`).
 */
export async function readNotice(body: string, ip: string | null): Promise<ReadNotice> {
  const c = config();
  if (!c) return { ok: false, reason: "PayFast is not set up", signed: false };

  const pairs = [...new URLSearchParams(body)];

  // Signed as posted: in PayFast's order, values untrimmed, blanks kept. The signature covers only the pairs before it, so only they are read: whatever follows is unsigned, and anyone could append it to a form the shop signed.
  const at = pairs.findIndex(([k]) => k === "signature");
  if (at === -1) return { ok: false, reason: "no signature", signed: false };
  const signedPairs = pairs.slice(0, at);
  const params = paramString(signedPairs);
  if (!safeEqual(pairs[at][1], sign(params, c.passphrase))) return { ok: false, reason: "signature mismatch", signed: false };

  // A repeated key would let one value be signed and another read; and the checkout form (which the shop hands browsers, signed with the same passphrase) carries keys no notice does.
  const keys = signedPairs.map(([k]) => k);
  if (new Set(keys).size !== keys.length) return { ok: false, reason: "repeated fields", signed: false };
  if (keys.some((k) => CHECKOUT_ONLY.has(k))) return { ok: false, reason: "a checkout form, not a notice", signed: false };
  const fields = Object.fromEntries(signedPairs);

  const notice: Notice = {
    attempt: cap(fields.m_payment_id),
    pfPaymentId: cap(fields.pf_payment_id),
    status: cap(fields.payment_status),
    amountGross: cap(fields.amount_gross),
    amountFee: cap(fields.amount_fee),
    amountNet: cap(fields.amount_net),
  };
  if (fields.merchant_id !== c.merchantId) return { ok: false, reason: `for another merchant (${fields.merchant_id ?? "none"})`, signed: true, notice };

  const [source, confirmed] = await Promise.all([fromPayfast(ip), confirmedByPayfast(c.host, params)]);
  if (!source) return { ok: false, reason: `not from a PayFast address (${ip ?? "none"})`, signed: true, notice };
  // Ours to retry: answering with an error has PayFast send the notice again.
  if (confirmed === "unreachable") return { ok: false, reason: "PayFast’s confirmation was unreachable", signed: true, notice, retry: true };
  if (!confirmed) return { ok: false, reason: "PayFast did not confirm it", signed: true, notice };

  return { ok: true, notice };
}

/** The gross PayFast reported, to the cent, against what was asked for (cents). */
export const amountMatches = (cents: number, amountGross: string) =>
  /^\d{1,9}(\.\d{1,2})?$/.test(amountGross) && Math.round(Number(amountGross) * 100) === cents;
