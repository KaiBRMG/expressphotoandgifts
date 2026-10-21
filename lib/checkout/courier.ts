import "server-only";

import { SHOP } from "@/app/site/data";
import { shippingBoxes } from "@/lib/settings";
import { parcelFor, type BoxId, type SizedParcel } from "./boxes";
import { nationalPhone, type Address, type Contact, type Recipient } from "./details";
import type { DeliveryOption, Quote, TrackingEvent } from "./order";

/**
 * The Courier Guy's API, from the server only, with the account's key.
 * The reference is TCG's Postman collection (thecourierguy.co.za/api-docs).
 *
 * Settings: TCG_API_KEY, made in TCG's portal; TCG_API_URL, the host, which
 * defaults to production (https://api.portal.thecourierguy.co.za). TCG's
 * sandbox is https://api.shiplogic.com, with a key from a sandbox account:
 * a production key is refused there, and the reverse.
 *
 * Replies: errors are plain text unless the path is prefixed with /v3, and
 * fields with falsy values may be left out, so every reply is read
 * defensively. Prices are rands, VAT inclusive (`rate`); stored here in cents.
 */

const HOST = "https://api.portal.thecourierguy.co.za";

export const courierReady = () => Boolean(process.env.TCG_API_KEY?.trim());

const base = () => (process.env.TCG_API_URL?.trim() || HOST).replace(/\/+$/, "");

/**
 * The value declared for nothing: TCG charged no insurance up to R1,000 and
 * R57.50 from R1,500 when this was written. Only a starting point: every price
 * shown comes from TCG's own quote at the value declared, so a change on
 * TCG's side changes the price, never what is charged against what is shown.
 */
const FREE_COVER = 100_000;

/** TCG refuses a declared value above R30,000 ("declared value is more than the allowed maximum (30000)"). */
const MAX_COVER = 3_000_000;

/** Cents to the whole rands declared: down, so the free cover is never passed by a few cents. */
const wholeRands = (cents: number) => Math.floor(Math.max(0, cents) / 100);

/** What an order of this value (cents) is declared at, insured in full: whole rands, up to TCG's maximum. In cents. */
export const fullCover = (value: number) => wholeRands(Math.min(value, MAX_COVER)) * 100;

const str = (x: unknown) => (typeof x === "string" ? x : "");

/** TCG's expected delivery window, when it gave both ends. */
const estimateOf = (from: unknown, to: unknown) => (typeof from === "string" && typeof to === "string" ? { estimate: { from, to } } : {});

type Reply = { status: number; body: unknown; message: string };

/**
 * One call to TCG: its status, its body read as JSON where it is JSON, and
 * its message (the JSON's `message` or the plain text), or null when TCG
 * couldn't be reached or didn't answer in time.
 */
async function tcg(path: string, init: { method?: "GET" | "POST"; body?: unknown; timeout?: number } = {}): Promise<Reply | null> {
  try {
    const res = await fetch(`${base()}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${process.env.TCG_API_KEY?.trim()}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeout ?? 12_000),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Plain text: TCG's errors outside /v3.
    }
    const message = typeof body === "string" ? body : typeof (body as { message?: unknown })?.message === "string" ? (body as { message: string }).message : "";
    return { status: res.status, body, message: message.slice(0, 300) };
  } catch (e) {
    console.error("The Courier Guy unreachable", path, e);
    return null;
  }
}

/** The shop, as the courier collects from it. */
const COLLECTION = {
  type: "business",
  company: SHOP.name,
  street_address: SHOP.street,
  local_area: SHOP.town,
  city: SHOP.town,
  zone: SHOP.province,
  country: "ZA",
  code: SHOP.postcode,
};

const deliveryAddress = (a: Address) => ({
  type: "residential",
  company: "",
  street_address: a.street,
  local_area: a.suburb,
  city: a.city,
  zone: a.province,
  country: "ZA",
  code: a.code,
});

const parcelOf = (p: SizedParcel) => ({ submitted_length_cm: p.length, submitted_width_cm: p.width, submitted_height_cm: p.height, submitted_weight_kg: p.weight });

type Rate = Omit<DeliveryOption, "cover" | "full">;

/** TCG's services for one declared value, or why there are none. */
async function rates(address: Address, parcels: SizedParcel[], cover: number): Promise<{ ok: true; rates: Rate[] } | Extract<Quote, { ok: false }>> {
  const declared = wholeRands(cover);
  const reply = await tcg("/rates", {
    method: "POST",
    body: {
      collection_address: COLLECTION,
      delivery_address: deliveryAddress(address),
      parcels: parcels.map(parcelOf),
      ...(declared > 0 ? { declared_value: declared } : {}),
    },
  });
  if (!reply) return { ok: false, reason: "unavailable" };
  if (reply.status !== 200) {
    // A refusal here is the shop's request or TCG's service, never the customer's address: TCG answers an address it can't serve with no rates.
    console.error("Courier rates refused", reply.status, reply.message);
    return { ok: false, reason: "unavailable" };
  }
  const body = reply.body as { rates?: unknown; no_rates_reason?: unknown };
  const list = Array.isArray(body?.rates) ? body.rates : [];
  const found = list.flatMap((r): Rate[] => {
    const { rate, service_level: s } = (r ?? {}) as { rate?: unknown; service_level?: { code?: unknown; name?: unknown; description?: unknown } };
    if (typeof s?.code !== "string" || !s.code || typeof rate !== "number" || !(rate > 0)) return [];
    return [{ code: s.code, name: str(s.name).trim() || s.code, description: str(s.description).trim() || null, price: Math.round(rate * 100) }];
  });
  if (found.length === 0) {
    if (body?.no_rates_reason) console.warn("Courier has no rates", body.no_rates_reason);
    return { ok: false, reason: "no-service" };
  }
  return { ok: true, rates: found };
}

/**
 * Every service the courier offers to this address for this box, cheapest
 * first, in cents. Each is priced with the order's value declared up to the
 * free cover, and where the order is worth more, priced again with its full
 * value (up to TCG's maximum) declared: `full`, which the customer may choose.
 * When the full value costs nothing more, it is simply the cover.
 */
export async function quote(address: Address, value: number, box: BoxId): Promise<Quote> {
  if (!courierReady()) return { ok: false, reason: "not-set-up" };
  const parcels = [parcelFor(await shippingBoxes(), box)];
  const free = wholeRands(Math.min(value, FREE_COVER)) * 100;
  const all = fullCover(value);

  const [basic, insured] = await Promise.all([rates(address, parcels, free), all > free ? rates(address, parcels, all) : null]);
  if (!basic.ok) return basic;
  const fullBy = new Map(insured?.ok ? insured.rates.map((r) => [r.code, r.price]) : []);

  const options = basic.rates
    .map((r): DeliveryOption => {
      const fullPrice = fullBy.get(r.code);
      if (fullPrice === undefined) return { ...r, cover: free, full: null };
      if (fullPrice <= r.price) return { ...r, price: fullPrice, cover: all, full: null };
      return { ...r, cover: free, full: { price: fullPrice, cover: all } };
    })
    .sort((a, b) => a.price - b.price);
  return { ok: true, options };
}

// ─── Shipments ─────────────────────────────────────────────────────────────────

/** One of the account's paid extras (`/rates/opt-in`): a flat surcharge, or a time-based one (a Saturday, early or after-hours slot). */
export type Extra = { id: number; kind: "flat" | "timed"; name: string; charge: number; applies: "collection" | "delivery" | null };

/**
 * What staff choose when booking, beyond the boxes: the day the courier may
 * collect from (`YYYY-MM-DD`, the shop's date), the hours it may collect in
 * (`HH:MM`), and the account's extras to add, by id.
 */
export type BookingOptions = { collectionDate: string | null; after: string | null; before: string | null; extras: number[] };

export const NO_OPTIONS: BookingOptions = { collectionDate: null, after: null, before: null, extras: [] };

/** Out to the customer, or back from them to the shop (a return of a delivered waybill). */
export type Direction = "out" | "return";

/**
 * A waybill to price or book. `service.cover` is the value declared. A return
 * names the delivered waybill it returns (`returnOf`, its short reference) and
 * is collected from the delivery address and its contact, to the shop.
 */
export type Booking = {
  ref: string;
  direction: Direction;
  contact: Contact;
  address: Address;
  recipient: Recipient | null;
  service: { code: string; cover?: number };
  parcels: SizedParcel[];
  options: BookingOptions;
  /** The extras chosen, as the account lists them: `options.extras` resolved. */
  extras: Extra[];
  returnOf?: string;
};

/** What TCG reported of a shipment it made. `short` is its short reference, which a return names. */
export type Booked = {
  id: number;
  tracking: string;
  short: string;
  rate?: number;
  status?: string;
  estimate?: { from: string; to: string };
  service?: { code: string; name: string };
};

/**
 * What came of asking TCG for a waybill: made; refused, so nothing was made
 * and staff can correct it and try again; or unknown (no answer, a server
 * error, an answer that can't be read), when it may have been made.
 */
type BookResult = { kind: "booked"; shipment: Booked } | { kind: "refused"; error: string } | { kind: "unknown"; error: string };

/** A shipment's facts from a TCG reply (the shipment itself, as POST and GET /shipments return it), or null. */
function readShipment(x: unknown): Booked | null {
  const s = x as Record<string, unknown> | null;
  if (!s || typeof s !== "object" || typeof s.id !== "number" || !(s.id > 0)) return null;
  const short = str(s.short_tracking_reference);
  const tracking = str(s.custom_tracking_reference) || short;
  if (!tracking) return null;
  return {
    id: s.id,
    tracking,
    short: short || tracking,
    ...(typeof s.rate === "number" ? { rate: Math.round(s.rate * 100) } : {}),
    ...(typeof s.status === "string" ? { status: s.status } : {}),
    ...estimateOf(s.estimated_delivery_from, s.estimated_delivery_to),
    ...(str(s.service_level_code) ? { service: { code: str(s.service_level_code), name: str(s.service_level_name) || str(s.service_level_code) } } : {}),
  };
}

/** The reference a waybill carries at TCG: the order's, with "-R" for its return, so the two are never confused. */
export const tcgReference = (ref: string, direction: Direction) => (direction === "return" ? `${ref}-R` : ref);

const shopContact = () => ({ name: SHOP.name, mobile_number: nationalPhone(SHOP.phoneDisplay) ?? SHOP.phoneDisplay, email: SHOP.email });

/** The person at the customer's door: the driver calls them and TCG's SMS (and any PIN) goes to them. A gift's recipient has no email here, so TCG's emails don't reach them. */
const customerContact = (b: Pick<Booking, "contact" | "recipient">) =>
  b.recipient
    ? { name: b.recipient.name, mobile_number: b.recipient.phone }
    : { name: `${b.contact.firstName} ${b.contact.lastName}`, mobile_number: b.contact.phone, email: b.contact.email };

/** Where a waybill goes from and to: the shop to the customer, or for a return, back. */
const route = (direction: Direction, address: Address) =>
  direction === "out"
    ? { collection_address: COLLECTION, delivery_address: deliveryAddress(address) }
    : { collection_address: deliveryAddress(address), delivery_address: COLLECTION };

/** The fields every price and booking of a waybill shares: route, parcels, cover, the collection day and hours, and the extras. */
function waybill(b: Pick<Booking, "direction" | "address" | "parcels" | "service" | "options" | "extras">) {
  const declared = wholeRands(b.service.cover ?? 0);
  const { collectionDate, after, before } = b.options;
  return {
    ...route(b.direction, b.address),
    parcels: b.parcels.map((p) => ({ ...parcelOf(p), parcel_description: "Photo gifts" })),
    ...(declared > 0 ? { declared_value: declared } : {}),
    // Midnight in the shop's time zone, so the date is the shop's, not UTC's.
    ...(collectionDate ? { collection_min_date: `${collectionDate}T00:00:00+02:00` } : {}),
    ...(after ? { collection_after: after } : {}),
    ...(before ? { collection_before: before } : {}),
    opt_in_rates: b.extras.filter((e) => e.kind === "flat").map((e) => e.id),
    opt_in_time_based_rates: b.extras.filter((e) => e.kind === "timed").map((e) => e.id),
  };
}

/** Statuses that say TCG didn't make the waybill at all, whatever was sent. */
const NOT_MADE = new Set([400, 401, 403, 404, 405, 412, 422, 423, 429]);

/**
 * Books the waybill (POST /shipments) by the service's code, not its id: a
 * quoted id expires after five minutes, and TCG prices the shipment again
 * when it is made. Without a collection day, the courier collects on its
 * next round.
 *
 * TCG documents no idempotency key, so this is never retried here: the
 * caller holds the order while it runs and treats `unknown` as possibly made.
 */
export async function createShipment(b: Booking): Promise<BookResult> {
  if (!courierReady()) return { kind: "refused", error: "The Courier Guy isn’t set up (TCG_API_KEY)." };
  const out = b.direction === "out";
  const reply = await tcg("/shipments", {
    method: "POST",
    timeout: 30_000,
    body: {
      ...waybill(b),
      collection_contact: out ? shopContact() : customerContact(b),
      delivery_contact: out ? customerContact(b) : shopContact(),
      ...(b.address.notes ? { [out ? "special_instructions_delivery" : "special_instructions_collection"]: b.address.notes } : {}),
      service_level_code: b.service.code,
      customer_reference: tcgReference(b.ref, b.direction),
      customer_reference_name: out ? "Order no." : "Return of order",
      mute_notifications: false,
      ...(out ? {} : { is_return: true, short_tracking_reference: b.returnOf }),
    },
  });
  if (!reply) return { kind: "unknown", error: "The Courier Guy didn’t answer in time." };
  if (reply.status === 200 || reply.status === 201) {
    const shipment = readShipment(reply.body);
    return shipment ? { kind: "booked", shipment } : { kind: "unknown", error: "The Courier Guy accepted it, but its answer couldn’t be read." };
  }
  if (NOT_MADE.has(reply.status)) return { kind: "refused", error: reply.message || `The Courier Guy refused it (${reply.status}).` };
  return { kind: "unknown", error: reply.message || `The Courier Guy had a problem (${reply.status}).` };
}

/** A service as staff are shown it before booking: TCG's price for exactly this waybill, and its dates. */
export type Priced = { code: string; name: string; price: number; collection: string | null; delivery: { from: string; to: string } | null };

/** What TCG would charge for this waybill, each service, cheapest first; or why it can't say. */
export async function priceWaybill(b: Pick<Booking, "direction" | "address" | "parcels" | "service" | "options" | "extras">): Promise<{ ok: true; services: Priced[] } | { error: string }> {
  const reply = await tcg("/rates", { method: "POST", body: waybill(b) });
  if (!reply) return { error: "The Courier Guy didn’t answer. Try again." };
  if (reply.status !== 200) return { error: reply.message || `The Courier Guy refused it (${reply.status}).` };
  const body = reply.body as { rates?: unknown; no_rates_reason?: unknown };
  const services = (Array.isArray(body?.rates) ? body.rates : []).flatMap((r): Priced[] => {
    const { rate, service_level: s } = (r ?? {}) as { rate?: unknown; service_level?: Record<string, unknown> };
    if (!s || typeof s.code !== "string" || typeof rate !== "number") return [];
    const from = str(s.delivery_date_from);
    const to = str(s.delivery_date_to);
    return [{ code: s.code, name: str(s.name) || s.code, price: Math.round(rate * 100), collection: str(s.collection_date) || null, delivery: from && to ? { from, to } : null }];
  });
  if (services.length === 0) return { error: str(body?.no_rates_reason) || "The Courier Guy has no service for this." };
  return { ok: true, services: services.sort((a, c) => a.price - c.price) };
}

/** The account's extras for a waybill to or from this address (`/rates/opt-in`), with their charges in cents. */
export async function accountExtras(direction: Direction, address: Address): Promise<{ ok: true; extras: Extra[] } | { error: string }> {
  const reply = await tcg("/rates/opt-in", { method: "POST", body: route(direction, address) });
  if (!reply) return { error: "The Courier Guy didn’t answer. Try again." };
  if (reply.status !== 200) return { error: reply.message || `The Courier Guy refused it (${reply.status}).` };
  const body = reply.body as { opt_in_rates?: unknown; opt_in_time_based_rates?: unknown };
  const read = (list: unknown, kind: Extra["kind"]) =>
    (Array.isArray(list) ? list : []).flatMap((x): Extra[] => {
      const e = x as Record<string, unknown>;
      if (typeof e?.id !== "number" || typeof e.charge_value !== "number" || !str(e.name).trim()) return [];
      const applies = e.type === "collection" || e.type === "delivery" ? e.type : null;
      return [{ id: e.id, kind, name: str(e.name).trim(), charge: Math.round(e.charge_value * 100), applies }];
    });
  return { ok: true, extras: [...read(body?.opt_in_time_based_rates, "timed"), ...read(body?.opt_in_rates, "flat")] };
}

/** A waybill on the account, as TCG lists it. */
export type Listed = Booked & { reference: string; created: string; isReturn: boolean };

const tcgTime = (d: Date) => d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "+00:00");

/**
 * Every waybill the account made between `from` and `until`, however it was
 * booked (here or in TCG's portal), up to `max`; null when TCG couldn't be
 * asked. TCG has no documented filter on the customer reference, so callers
 * match it here.
 */
export async function listShipments(from: Date, until: Date, max = 1000): Promise<Listed[] | null> {
  const found: Listed[] = [];
  for (let offset = 0; offset < max; offset += 100) {
    const q = new URLSearchParams({ date_filter: "time_created", start_date: tcgTime(from), end_date: tcgTime(until), limit: "100", offset: String(offset) });
    const reply = await tcg(`/shipments?${q}`);
    if (!reply || reply.status !== 200) return null;
    // { shipments: [...], count }
    const list = (reply.body as { shipments?: unknown } | null)?.shipments;
    if (!Array.isArray(list)) return null;
    for (const x of list) {
      const s = x as Record<string, unknown>;
      const shipment = readShipment(s);
      if (shipment) found.push({ ...shipment, reference: str(s.customer_reference), created: str(s.time_created), isReturn: s.is_return === true });
    }
    if (list.length < 100) break;
  }
  return found;
}

/** The waybills TCG made for an order (or its return) in the window given: for settling a booking whose outcome was unknown. */
export async function findShipments(ref: string, direction: Direction, from: Date, until: Date): Promise<Booked[] | null> {
  const listed = await listShipments(from, until);
  const reference = tcgReference(ref, direction);
  return listed && listed.filter((s) => s.reference === reference);
}

/** Every https link anywhere in a reply: TCG's proof-of-delivery replies are documented only as "signed POD images (and other metadata)". */
const linksIn = (x: unknown, found = new Set<string>()): Set<string> => {
  if (typeof x === "string" && /^https:\/\/\S+$/.test(x)) found.add(x);
  else if (x && typeof x === "object") for (const v of Object.values(x)) linksIn(v, found);
  return found;
};

/**
 * A delivered waybill's proof of delivery: the files the driver captured
 * (photos and PDFs, signed links) and TCG's digital POD, a PDF of the
 * delivery's details. Read from TCG on request; the links expire.
 */
export async function proofOfDelivery(tracking: string): Promise<{ ok: true; photos: string[]; pdfs: string[]; digital: string | null } | { error: string }> {
  const ref = encodeURIComponent(tracking);
  const [files, digital] = await Promise.all([tcg(`/shipments/pod/images?tracking_reference=${ref}`), tcg(`/shipments/digital-pod?tracking_reference=${ref}`)]);
  if (!files && !digital) return { error: "The Courier Guy didn’t answer. Try again." };
  const links = files?.status === 200 ? [...linksIn(files.body)] : [];
  const isPdf = (u: string) => /\.pdf(\?|$)/i.test(u);
  const digitalUrl = digital?.status === 200 ? ([...linksIn(digital.body)][0] ?? null) : null;
  if (!links.length && !digitalUrl) {
    const why = digital?.status === 200 || !digital ? files?.message : digital.message;
    return { error: why || "The Courier Guy has no proof of delivery for this waybill yet." };
  }
  return { ok: true, photos: links.filter((u) => !isPdf(u)), pdfs: links.filter(isPdf), digital: digitalUrl };
}

/** One line of the account's billing, as TCG records it: a charge (negative), its reversal, a payment… Cents. */
export type Charge = {
  id: number;
  date: string;
  type: string;
  amount: number;
  shipmentId: number | null;
  reversed: boolean;
  invoiceId: number | null;
  creditNoteId: number | null;
};

/**
 * The account's billing lines from `since` on, newest first (TCG lists them
 * newest first and takes no date range here, so pages are read until one
 * passes `since`); null when TCG couldn't be asked.
 */
export async function billingSince(since: Date, maxPages = 20): Promise<Charge[] | null> {
  const found: Charge[] = [];
  for (let page = 0; page < maxPages; page++) {
    const q = new URLSearchParams({ order_by: "transaction_date", order: "DESC", limit: "100", offset: String(page * 100) });
    const reply = await tcg(`/billing/transactions?${q}`);
    if (!reply || reply.status !== 200) return null;
    // { transactions: [...], count }
    const list = (reply.body as { transactions?: unknown } | null)?.transactions;
    if (!Array.isArray(list)) return null;
    for (const x of list) {
      const t = x as Record<string, unknown>;
      if (typeof t.id !== "number" || typeof t.amount !== "number") continue;
      const id = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
      found.push({
        id: t.id,
        date: str(t.transaction_date),
        type: str(t.type),
        amount: Math.round(t.amount * 100),
        shipmentId: id(t.shipment_id),
        reversed: t.has_been_reversed === true,
        invoiceId: id(t.invoice_id),
        creditNoteId: id(t.credit_note_id),
      });
    }
    const last = found.at(-1);
    if (list.length < 100 || (last && Date.parse(last.date) < since.getTime())) break;
  }
  return found.filter((c) => Date.parse(c.date) >= since.getTime());
}

/** TCG's account statement for the days given (`YYYY-MM-DD`), as a signed PDF link good for seven days. */
export async function statementPdf(from: string, to: string): Promise<{ url: string } | { error: string }> {
  const reply = await tcg(`/billing/statements?${new URLSearchParams({ start_date: from, end_date: to, pdf: "true" })}`);
  if (!reply) return { error: "The Courier Guy didn’t answer. Try again." };
  if (reply.status !== 200) return { error: reply.message || `The Courier Guy refused it (${reply.status}).` };
  // { url, filename, bucket, file_size, expiry_duration }
  const url = (reply.body as { url?: unknown } | null)?.url;
  return typeof url === "string" && /^https:\/\/\S+$/.test(url) ? { url } : { error: "The Courier Guy’s answer had no link in it." };
}

/** A signed link to the waybill PDF (or the parcel stickers), good for 24 hours, or why not. */
export async function shipmentLabel(id: number, kind: "waybill" | "stickers"): Promise<{ url: string } | { error: string }> {
  const reply = await tcg(`/shipments/label${kind === "stickers" ? "/stickers" : ""}?id=${encodeURIComponent(id)}`);
  if (!reply) return { error: "The Courier Guy didn’t answer. Try again." };
  if (reply.status !== 200) return { error: reply.message || `The Courier Guy refused it (${reply.status}).` };
  // { url, filename, bucket, file_size, expiry_duration }
  const url = (reply.body as { url?: unknown } | null)?.url;
  return typeof url === "string" && /^https:\/\/\S+$/.test(url) ? { url } : { error: "The Courier Guy’s answer had no link in it." };
}

/** Cancels a waybill. TCG reverses its charges only if the parcel hasn't been collected. */
export async function cancelShipment(tracking: string): Promise<{ ok: true } | { error: string }> {
  const reply = await tcg("/shipments/cancel", { method: "POST", body: { tracking_reference: tracking } });
  if (!reply) return { error: "The Courier Guy didn’t answer. Check its portal before trying again." };
  return reply.status === 200 ? { ok: true } : { error: reply.message || `The Courier Guy refused it (${reply.status}).` };
}

/** A shipment's status and its events, newest first, as TCG's tracking reports them; null when they can't be had or read. */
export async function trackShipment(tracking: string): Promise<{ status: string; events: TrackingEvent[]; estimate?: { from: string; to: string } } | null> {
  const reply = await tcg(`/tracking/shipments?tracking_reference=${encodeURIComponent(tracking)}`);
  if (!reply || reply.status !== 200) {
    console.error("Courier tracking not read", tracking, reply?.status, reply?.message);
    return null;
  }
  // { shipments: [{ status, tracking_events, shipment_estimated_delivery_from, … }], tracking_steps }
  const shipments = (reply.body as { shipments?: unknown } | null)?.shipments;
  const s = (Array.isArray(shipments) ? shipments[0] : null) as Record<string, unknown> | null;
  if (!s || typeof s.status !== "string") {
    console.error("Courier tracking unreadable", tracking);
    return null;
  }
  const events = (Array.isArray(s.tracking_events) ? s.tracking_events : [])
    .map((e: Record<string, unknown>): TrackingEvent => ({ at: str(e?.date), status: str(e?.status), message: str(e?.message), location: str(e?.location) }))
    .filter((e) => e.at && e.status && !Number.isNaN(Date.parse(e.at)))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return { status: s.status, events, ...estimateOf(s.shipment_estimated_delivery_from, s.shipment_estimated_delivery_to) };
}
