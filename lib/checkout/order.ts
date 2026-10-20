import { orderWhat } from "@/lib/catalog/purchase";
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
  /** The customer's note to the shop about this line: read by staff, never printed. */
  note: string;
};


/** A courier service as offered at checkout: price in cents, VAT inclusive. */
export type DeliveryOption = { code: string; name: string; description: string | null; price: number };

/** The courier's services to an address, or why there are none. */
export type Quote = { ok: true; options: DeliveryOption[] } | { ok: false; reason: "not-set-up" | "no-service" | "unavailable" };

/** Collect, or courier with a service: its code as chosen, or the service as priced (`DeliveryOption`). */
export type Fulfilment<S = string> = { method: "collect" } | { method: "courier"; address: Address; service: S };

export type OrderInput = {
  ref: string;
  /** The browser's secret for this ref (`ORDER_KEY`): only it can replace the order while unpaid. */
  key: string;
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
  /** Trimmed; absent when the customer left none. */
  note?: string;
};

export type OrderStatus = "pending" | "paid";

/** Where a paid order is in the shop: just in, being made, ready (to collect or to send), and gone. */
export const STAGES = ["new", "making", "ready", "done"] as const;
export type OrderStage = (typeof STAGES)[number];

/** A stage in the shop's words, which differ for an order collected and one sent. */
export const stageLabel = (stage: OrderStage, method: Fulfilment["method"]) =>
  ({
    new: "New",
    making: "Being made",
    ready: method === "collect" ? "Ready to collect" : "Ready to send",
    done: method === "collect" ? "Collected" : "Sent",
  })[stage];

/** What the customer paid for: the order as it stood when they pressed Pay. */
export type Snapshot = Pick<Order, "contact" | "fulfilment" | "lines" | "subtotal" | "delivery" | "total">;

/**
 * One press of Pay (`orders/{ref}/attempts/{id}`): the order frozen as it was
 * then, under the ID PayFast carries as `m_payment_id`. The customer can go on
 * changing the order, but a payment always pays for its own attempt.
 */
export type Attempt = Snapshot & { id: string; ref: string; createdAt: string };

/** A PayFast notice's facts: which attempt it is for (`m_payment_id`), PayFast's payment, and the amounts in rands ("123.45"). */
export type Notice = { attempt: string; pfPaymentId: string; status: string; amountGross: string; amountFee: string; amountNet: string };

/** The payment that paid an order, as its notice reported it. */
export type Payment = Notice & { provider: "payfast"; at: string };

/** What became of a notice: paid the order, or why it didn't. */
export type NoticeOutcome = "paid" | "duplicate" | "mismatch" | "not-complete" | "unknown-attempt" | "refused";

/** Every PayFast notice that reached an order (`orders/{ref}/notices/{id}`), whatever came of it. */
export type NoticeRecord = Notice & { at: string; outcome: NoticeOutcome; reason?: string };

/** Something about an order the shop must look at by hand, such as a payment that didn't match. */
export type Issue = { at: string; text: string };

/** A refund the shop made in PayFast's dashboard, recorded here. Cents. */
export type Refund = { at: string; by: string; amount: number; note: string };

/** Who did what to an order in the admin. */
export type LogEntry = { at: string; by: string; text: string };

/** Whether an order email went. */
export type EmailSent = { at: string; ok: boolean; error?: string };

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
  /** SHA-256 of the browser's key: whoever first saved the ref. Never leaves the server. */
  claim?: string;
  createdAt: string;
  updatedAt: string;
  /** How many times Pay was pressed: the last attempt's number. */
  attempts?: number;
  /** Set once paid: the payment, when, and where the shop has got to with it. */
  payment?: Payment;
  paidAt?: string;
  stage?: OrderStage;
  /** True while something on the order waits for the shop to look at it (`issues`). */
  flagged?: boolean;
  issues?: Issue[];
  refunds?: Refund[];
  emails?: { shop?: EmailSent; customer?: EmailSent };
  log?: LogEntry[];
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

/** An attempt's ID, the order's ref and its number: "EPG-7K2QX9-3". */
export const ATTEMPT = /^(EPG-[A-Z0-9]{6})-([1-9]\d{0,2})$/;

/** Pay pressed this many times on one order is not a customer paying: past it, they call the shop. */
export const MAX_ATTEMPTS = 200;

/** PayFast refuses a payment under R5.00. Cents. */
export const MIN_PAYMENT = 500;

/** The longest note staff give a refund or a resolved issue. */
export const NOTE_MAX = 300;

/** Where the customer sees their order, from PayFast's return and from their email. */
export const receiptPath = (ref: string, token: string) => `/checkout/done?ref=${ref}&t=${token}`;

/** "2 × Coffee Mug (1 photo)": a line as the receipt, the emails and the admin name it. */
export const lineWhat = (l: Pick<OrderLine, "name" | "variant" | "quantity">) => `${l.quantity} × ${orderWhat(l.name, l.variant)}`;

/** How many photos the shop has for a line. */
export const fileCount = (l: Pick<OrderLine, "sets">) => l.sets.reduce((n, s) => n + s.files.length, 0);

/** Cents refunded so far. */
export const refundedOf = (o: Pick<Order, "refunds">) => (o.refunds ?? []).reduce((n, r) => n + r.amount, 0);

export const DAY_MS = 24 * 60 * 60 * 1000;

/** How long the photo step keeps an unpaid order's photos before starting over. */
export const KEEP_DAYS = 10;

/** When the daily sweep deletes an unpaid order's photos: always after the browser has let go of them. */
export const SWEEP_AFTER_DAYS = KEEP_DAYS + 4;

/** The secret the photo step makes beside the ref: 32 hex characters, kept in that browser only. */
export const ORDER_KEY = /^[0-9a-f]{32}$/;

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
  const l = x as { sku?: unknown; quantity?: unknown; sets?: unknown; frame?: { empty?: unknown; quote?: unknown }; note?: unknown } | null;
  if (!l || typeof l.sku !== "string" || typeof l.quantity !== "number" || !Array.isArray(l.sets)) return null;
  const sets = l.sets.map(readSet);
  if (!sets.every(Boolean)) return null;
  const line: LineInput = { sku: l.sku, quantity: l.quantity, sets: sets as LineSet[], note: str(l.note) };
  if (l.frame) line.frame = { empty: l.frame.empty === true, quote: l.frame.quote === true };
  return line;
}

/**
 * Reads what the browser sent into an `OrderInput`, or null when it is not
 * shaped like one. Only the shape: whether it can be sold is `priceOrder`'s.
 */
export function readOrderInput(x: unknown): OrderInput | null {
  const o = x as { ref?: unknown; key?: unknown; contact?: unknown; fulfilment?: { method?: unknown; address?: unknown; service?: unknown }; lines?: unknown; shownTotal?: unknown } | null;
  if (!o || typeof o.ref !== "string" || typeof o.key !== "string" || !ORDER_KEY.test(o.key) || typeof o.shownTotal !== "number" || !Array.isArray(o.lines) || o.lines.length > MAX_LINES) return null;
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
  return { ref: o.ref, key: o.key, contact, fulfilment, lines: lines as LineInput[], shownTotal: o.shownTotal };
}
