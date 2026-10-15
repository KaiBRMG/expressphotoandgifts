import "server-only";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";

import { SHOP } from "@/app/site/data";
import type { Checkout, Order } from "./order";

/**
 * PayFast (developers.payfast.co.za): the payment, signed here so the
 * passphrase never leaves the server, and the payment notice (ITN) checked
 * here before an order counts as paid.
 *
 * Settings: PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE,
 * PAYFAST_SANDBOX=true for sandbox.payfast.co.za, and PAYFAST_ONSITE=false to
 * always use PayFast's own page instead of its Onsite window. SITE_URL is the
 * public address PayFast returns the customer to and posts notices to; it
 * must be reachable from the internet for notices to arrive.
 */

function config() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const site = process.env.SITE_URL?.replace(/\/$/, "");
  if (!merchantId || !merchantKey || !site) return null;
  return {
    merchantId,
    merchantKey,
    passphrase: process.env.PAYFAST_PASSPHRASE?.trim() || null,
    site,
    host: process.env.PAYFAST_SANDBOX === "true" ? "sandbox.payfast.co.za" : "www.payfast.co.za",
    onsite: process.env.PAYFAST_ONSITE !== "false",
  };
}

export const payfastReady = () => config() !== null;

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
const sign = (params: string, passphrase: string | null) =>
  createHash("md5")
    .update(passphrase ? `${params}&passphrase=${pfEncode(passphrase)}` : params)
    .digest("hex");

/**
 * Builds the payment for an order: the redirect form, and with `onsite`, an
 * Onsite identifier as well. PayFast's field order is fixed (merchant, then
 * customer, then transaction, then options) and never alphabetical; blanks
 * are left out, and values are trimmed, as PayFast signs them.
 */
export async function startPayment(order: Order, onsite: boolean): Promise<Checkout | null> {
  const c = config();
  if (!c) return null;
  const receipt = `${c.site}/checkout/done?ref=${order.ref}&t=${order.token}`;

  const fields = (urls: boolean): [string, string][] =>
    (
      [
        ["merchant_id", c.merchantId],
        ["merchant_key", c.merchantKey],
        ...(urls ? [["return_url", receipt], ["cancel_url", `${c.site}/checkout/details?cancelled=1`]] : []),
        ["notify_url", `${c.site}/api/payfast/notify`],
        ["name_first", order.contact.firstName],
        ["name_last", order.contact.lastName],
        ["email_address", order.contact.email],
        ["cell_number", order.contact.phone],
        ["m_payment_id", order.ref],
        ["amount", pfAmount(order.total)],
        ["item_name", `${SHOP.name} order ${order.ref}`],
        ["email_confirmation", "1"],
        ["confirmation_address", SHOP.email],
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
      const res = await fetch(`https://${c.host}/onsite/process`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `${params}&signature=${sign(params, c.passphrase)}`,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
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

/** The hosts a notice may come from, as PayFast lists them. */
const PAYFAST_HOSTS = ["www.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za", "sandbox.payfast.co.za"];
const HOSTS_FRESH_MS = 10 * 60 * 1000;
let known: { ips: Set<string>; at: number } | null = null;

/** Whether an address is one of PayFast's; its hosts are looked up again every ten minutes, or for an address not seen. */
async function fromPayfast(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  if (!known || Date.now() - known.at > HOSTS_FRESH_MS || !known.ips.has(ip)) {
    const found = await Promise.all(PAYFAST_HOSTS.map((h) => lookup(h, { all: true }).catch(() => [])));
    known = { ips: new Set(found.flat().map((a) => a.address)), at: Date.now() };
  }
  return known.ips.has(ip);
}

/** PayFast's own word that it sent the notice. */
async function confirmedByPayfast(host: string, params: string): Promise<boolean | "unreachable"> {
  try {
    const res = await fetch(`https://${host}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return (await res.text()).trim() === "VALID";
  } catch {
    return "unreachable";
  }
}

export type Notice = { ref: string; pfPaymentId: string; status: string; amountGross: string };

/**
 * Reads a notice's raw body and runs the checks that need no order: the
 * signature over every field posted before it, the merchant, where it came
 * from, and PayFast's own confirmation that it sent it. The amount is checked
 * against the order by the caller (`amountMatches`).
 */
export async function readNotice(
  body: string,
  ip: string | null,
): Promise<{ ok: true; notice: Notice } | { ok: false; reason: string; ref?: string; retry?: boolean }> {
  const c = config();
  if (!c) return { ok: false, reason: "PayFast is not set up" };

  const pairs = [...new URLSearchParams(body)];
  const fields = Object.fromEntries(pairs);
  const ref = fields.m_payment_id;

  // Signed as posted: in PayFast's order, values untrimmed, blanks kept.
  const at = pairs.findIndex(([k]) => k === "signature");
  const params = paramString(at === -1 ? pairs : pairs.slice(0, at));
  if (fields.signature !== sign(params, c.passphrase)) return { ok: false, reason: "signature mismatch", ref };
  if (fields.merchant_id !== c.merchantId) return { ok: false, reason: "wrong merchant", ref };

  const [source, confirmed] = await Promise.all([fromPayfast(ip), confirmedByPayfast(c.host, params)]);
  if (!source) return { ok: false, reason: `not from PayFast (${ip ?? "no address"})`, ref };
  // Ours to retry: answering with an error has PayFast send the notice again.
  if (confirmed === "unreachable") return { ok: false, reason: "PayFast's confirmation was unreachable", ref, retry: true };
  if (!confirmed) return { ok: false, reason: "PayFast did not confirm it", ref };

  return {
    ok: true,
    notice: { ref, pfPaymentId: fields.pf_payment_id ?? "", status: fields.payment_status ?? "", amountGross: fields.amount_gross ?? "" },
  };
}

/** PayFast's own tolerance: the gross within a cent of what the order asked for. */
export const amountMatches = (order: Pick<Order, "total">, amountGross: string) =>
  Math.abs(Number(amountGross) - Number(pfAmount(order.total))) <= 0.01;
