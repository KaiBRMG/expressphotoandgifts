import { readAddress, readContact, type Address, type Contact } from "./details";

/**
 * An order as the browser hands it over and as the shop keeps it in
 * Firestore (`orders/{ref}`). The browser says what was chosen and where each
 * photo is; the server prices it from the catalogue, never from the browser.
 */

/** One place's file in Cloudinary: the original upload, or the customer's edited render of it. */
export type PlacedFile = { slot: number; label: string; publicId: string; version: number; edited: boolean };

/** One unit's photos and words, or every unit's when they are the same on all. */
export type LineSet = { files: PlacedFile[]; words: string };

/** A frame taken without a print, or with a print the shop is to quote for. */
export type FrameChoice = { empty: boolean; quote: boolean };

export type LineInput = {
  sku: string;
  quantity: number;
  sets: LineSet[];
  frame?: FrameChoice;
};

/** A courier service as offered at checkout: price in cents, VAT inclusive. */
export type DeliveryOption = { code: string; name: string; description: string | null; price: number };

/** The courier's services to an address, or why there are none. */
export type Quote = { ok: true; options: DeliveryOption[] } | { ok: false; reason: "not-set-up" | "no-service" | "unavailable" };

/** Collect, or courier with a service: its code as chosen, or the service as priced (`DeliveryOption`). */
export type Fulfilment<S = string> = { method: "collect" } | { method: "courier"; address: Address; service: S };

export type OrderInput = {
  ref: string;
  contact: Contact;
  fulfilment: Fulfilment;
  lines: LineInput[];
  /** The total the customer was shown, in cents: if the server's differs, they see the new one before paying. */
  shownTotal: number;
};

export type OrderLine = {
  sku: string;
  slug: string;
  name: string;
  variant: string | null;
  /** Cents each, VAT inclusive, from the catalogue when the order was placed. */
  price: number;
  quantity: number;
  /** One set when the units are the same, one per unit otherwise; empty for a line that takes nothing. */
  sets: LineSet[];
  frame?: FrameChoice;
};

export type OrderStatus = "pending" | "paid";

export type Order = {
  ref: string;
  /** Unguessable: what the receipt page asks for alongside the ref. */
  token: string;
  status: OrderStatus;
  contact: Contact;
  fulfilment: Fulfilment<DeliveryOption>;
  lines: OrderLine[];
  /** Cents. */
  subtotal: number;
  delivery: number;
  total: number;
  /** The signed-in customer who placed it, if any. */
  uid: string | null;
  createdAt: string;
  updatedAt: string;
  payment?: { provider: "payfast"; pfPaymentId: string; amountGross: string; status: string; at: string };
  /** Set when a payment notice failed a check: the shop should look at this order by hand. */
  review?: string;
};

/** A payment, ready for the browser to take to PayFast. */
export type Checkout = {
  /** PayFast's payment page, for the redirect form. */
  action: string;
  /** The signed form for the redirect: returns to the receipt, or back to details on cancel. */
  fields: [string, string][];
  /** For Onsite: the payment's identifier and PayFast's script, or null when it could not be had. */
  onsite: { uuid: string; engine: string } | null;
};

/** "EPG-7K2QX9", as the photo step makes it. */
export const REF = /^EPG-[A-Z0-9]{6}$/;

/** At most this many lines in one order: past it is a bulk enquiry. */
const MAX_LINES = 100;

const str = (x: unknown) => (typeof x === "string" ? x : "");

function readSet(x: unknown): LineSet | null {
  const s = x as { files?: unknown; words?: unknown } | null;
  if (!s || !Array.isArray(s.files)) return null;
  const files = s.files.map((f): PlacedFile | null => {
    const p = f as Partial<PlacedFile> | null;
    if (!p || typeof p.publicId !== "string" || !Number.isInteger(p.version) || !Number.isInteger(p.slot)) return null;
    return { slot: p.slot!, label: str(p.label), publicId: p.publicId, version: p.version!, edited: p.edited === true };
  });
  return files.every(Boolean) ? { files: files as PlacedFile[], words: str(s.words) } : null;
}

function readLine(x: unknown): LineInput | null {
  const l = x as { sku?: unknown; quantity?: unknown; sets?: unknown; frame?: { empty?: unknown; quote?: unknown } } | null;
  if (!l || typeof l.sku !== "string" || typeof l.quantity !== "number" || !Array.isArray(l.sets)) return null;
  const sets = l.sets.map(readSet);
  if (!sets.every(Boolean)) return null;
  const line: LineInput = { sku: l.sku, quantity: l.quantity, sets: sets as LineSet[] };
  if (l.frame) line.frame = { empty: l.frame.empty === true, quote: l.frame.quote === true };
  return line;
}

/**
 * Reads what the browser sent into an `OrderInput`, or null when it is not
 * shaped like one. Only the shape: whether it can be sold is `priceOrder`'s.
 */
export function readOrderInput(x: unknown): OrderInput | null {
  const o = x as { ref?: unknown; contact?: unknown; fulfilment?: { method?: unknown; address?: unknown; service?: unknown }; lines?: unknown; shownTotal?: unknown } | null;
  if (!o || typeof o.ref !== "string" || typeof o.shownTotal !== "number" || !Array.isArray(o.lines) || o.lines.length > MAX_LINES) return null;
  const contact = readContact(o.contact);
  const lines = o.lines.map(readLine);
  if (!contact || !lines.every(Boolean)) return null;
  let fulfilment: Fulfilment;
  if (o.fulfilment?.method === "collect") fulfilment = { method: "collect" };
  else {
    const address = o.fulfilment?.method === "courier" ? readAddress(o.fulfilment.address) : null;
    if (!address || typeof o.fulfilment?.service !== "string") return null;
    fulfilment = { method: "courier", address, service: o.fulfilment.service };
  }
  return { ref: o.ref, contact, fulfilment, lines: lines as LineInput[], shownTotal: o.shownTotal };
}
