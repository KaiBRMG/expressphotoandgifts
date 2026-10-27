import { rands } from "@/lib/catalog/listing";

/**
 * Who the order is for and how it reaches them: the shapes and the checks,
 * shared by the details step in the browser and the server that places the
 * order, so both say the same thing about the same input. No secrets here.
 */

export type Contact = {
  firstName: string;
  lastName: string;
  email: string;
  /** A South African mobile number as typed; `nationalPhone` reads it. */
  phone: string;
};

/** A South African street address, in the fields The Courier Guy reads. */
export type Address = {
  street: string;
  /** Suburb or area: The Courier Guy's `local_area`. */
  suburb: string;
  city: string;
  province: Province;
  /** Four digits. */
  code: string;
  /** Unit, complex or anything the courier should know; optional. */
  notes: string;
};

/**
 * Who receives a courier delivery when it isn't the buyer, such as a gift
 * sent straight to them. The courier's driver and its SMS (and any delivery
 * PIN) go to this person; the buyer keeps the receipt and the shop's emails.
 */
export type Recipient = { name: string; phone: string };

export const EMPTY_RECIPIENT: Recipient = { name: "", phone: "" };

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export type Province = (typeof PROVINCES)[number] | "";

export const EMPTY_CONTACT: Contact = { firstName: "", lastName: "", email: "", phone: "" };
export const EMPTY_ADDRESS: Address = { street: "", suburb: "", city: "", province: "", code: "", notes: "" };

/** Field limits, held on both sides: PayFast takes 100 characters a name and an email. */
export const LIMITS = { name: 100, email: 100, line: 120, notes: 200, lineNote: 200 } as const;

/** "0764912300" from "076 491 2300", "+27 76 491 2300", "0027…" or "27764912300", whatever it is. */
const national = (raw: string) => {
  const digits = raw.replace(/[\s().-]/g, "").replace(/^(\+|00)/, "");
  return digits.startsWith("27") && digits.length === 11 ? `0${digits.slice(2)}` : digits;
};

/**
 * South African mobiles: 06x, 07x and 081–084. 080 (toll-free), 086
 * (share-call) and 087 (VoIP) share the 08 prefix but can't take an SMS.
 */
const MOBILE = /^0(?:[67]\d|8[1-4])\d{7}$/;

/** A South African mobile number in its national form, or null. */
export function nationalPhone(raw: string): string | null {
  const n = national(raw);
  return MOBILE.test(n) ? n : null;
}

/** Why a typed number isn't a mobile, in the customer's terms, or nothing when it is one. */
export function phoneProblem(raw: string, landline = "We need a mobile, so we can SMS you about your order."): string | undefined {
  const n = national(raw);
  if (MOBILE.test(n)) return undefined;
  if (!/^\d+$/.test(n)) return "Use digits only, like 076 491 2300.";
  if (n.length !== 10) return "South African numbers have 10 digits, like 076 491 2300.";
  if (/^0[1-5]/.test(n)) return `That looks like a landline. ${landline}`;
  return "That isn’t a mobile number. Use one that can get an SMS, like 076 491 2300.";
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s: string) => EMAIL.test(s.trim());

/** The shortest password a customer account takes; Firebase's own floor is 6. */
export const PASSWORD_MIN = 8;

/** What's wrong with a new password, or nothing. */
export const passwordError = (p: string) => (p.length < PASSWORD_MIN ? `Use at least ${PASSWORD_MIN} characters.` : undefined);

type Errors<T> = Partial<Record<keyof T, string>>;

export function contactErrors(c: Contact): Errors<Contact> {
  const e: Errors<Contact> = {};
  if (!c.firstName.trim()) e.firstName = "Add your first name.";
  else if (c.firstName.length > LIMITS.name) e.firstName = "That name is too long.";
  if (!c.lastName.trim()) e.lastName = "Add your surname.";
  else if (c.lastName.length > LIMITS.name) e.lastName = "That surname is too long.";
  if (!c.email.trim()) e.email = "Add your email, for the receipt.";
  else if (!isEmail(c.email) || c.email.length > LIMITS.email) e.email = "That doesn’t look like an email address.";
  if (!c.phone.trim()) e.phone = "Add a mobile number, so we can reach you about the order.";
  else {
    const problem = phoneProblem(c.phone);
    if (problem) e.phone = problem;
  }
  return e;
}

export function recipientErrors(r: Recipient): Errors<Recipient> {
  const e: Errors<Recipient> = {};
  if (!r.name.trim()) e.name = "Add the name of the person it’s going to.";
  else if (r.name.length > LIMITS.name) e.name = "That name is too long.";
  if (!r.phone.trim()) e.phone = "Add their mobile number, so the courier can reach them.";
  else {
    const problem = phoneProblem(r.phone, "The courier needs a mobile it can SMS.");
    if (problem) e.phone = problem;
  }
  return e;
}

export function addressErrors(a: Address): Errors<Address> {
  const e: Errors<Address> = {};
  if (!a.street.trim()) e.street = "Add the street address.";
  else if (a.street.length > LIMITS.line) e.street = "That’s too long for a street address.";
  if (!a.suburb.trim()) e.suburb = "Add the suburb or area.";
  else if (a.suburb.length > LIMITS.line) e.suburb = "That’s too long for a suburb.";
  if (!a.city.trim()) e.city = "Add the town or city.";
  else if (a.city.length > LIMITS.line) e.city = "That’s too long for a town.";
  if (!a.province) e.province = "Choose the province.";
  if (!/^\d{4}$/.test(a.code.trim())) e.code = "Postal codes are four digits.";
  if (a.notes.length > LIMITS.notes) e.notes = `Keep this under ${LIMITS.notes} characters.`;
  return e;
}

export const hasErrors = (e: object) => Object.keys(e).length > 0;

/** Nothing typed in any field: no address at all, rather than an incomplete one. */
export const isBlankAddress = (a: Address) => Object.values(a).every((v) => !v.trim());

/** Trimmed, with the phone in its national form: what is stored and sent on. */
export function cleanContact(c: Contact): Contact {
  return {
    firstName: c.firstName.trim(),
    lastName: c.lastName.trim(),
    email: c.email.trim().toLowerCase(),
    phone: nationalPhone(c.phone) ?? c.phone.trim(),
  };
}

export function cleanRecipient(r: Recipient): Recipient {
  return { name: r.name.trim(), phone: nationalPhone(r.phone) ?? r.phone.trim() };
}

export function cleanAddress(a: Address): Address {
  return {
    street: a.street.trim(),
    suburb: a.suburb.trim(),
    city: a.city.trim(),
    province: a.province,
    code: a.code.trim(),
    notes: a.notes.trim(),
  };
}

/** Reads untrusted input into a Contact, or null when it is not shaped like one. */
export function readContact(x: unknown): Contact | null {
  const c = x as Record<string, unknown> | null;
  if (!c || typeof c !== "object") return null;
  const keys = ["firstName", "lastName", "email", "phone"] as const;
  return keys.every((k) => typeof c[k] === "string") ? (Object.fromEntries(keys.map((k) => [k, c[k]])) as Contact) : null;
}

export function readRecipient(x: unknown): Recipient | null {
  const r = x as Record<string, unknown> | null;
  return r && typeof r === "object" && typeof r.name === "string" && typeof r.phone === "string" ? { name: r.name, phone: r.phone } : null;
}

export function readAddress(x: unknown): Address | null {
  const a = x as Record<string, unknown> | null;
  if (!a || typeof a !== "object") return null;
  const keys = ["street", "suburb", "city", "province", "code", "notes"] as const;
  if (!keys.every((k) => typeof a[k] === "string")) return null;
  if (a.province !== "" && !PROVINCES.includes(a.province as (typeof PROVINCES)[number])) return null;
  return Object.fromEntries(keys.map((k) => [k, a[k]])) as Address;
}

/** "10 Midas Ave, Olympus, Pretoria, 0081". */
/** "Thandi Mokoena": the name a contact gave. */
export const contactName = (c: Pick<Contact, "firstName" | "lastName">) => `${c.firstName} ${c.lastName}`.trim();

export const addressLine = (a: Address) => [a.street, a.suburb, a.city, a.code].filter(Boolean).join(", ");

/** The delivery row of an order's sums: "Collect from the shop", or "Delivery, Economy". */
export const deliveryLabel = (f: { method: "collect" } | { method: "courier"; service: { name: string } }) =>
  f.method === "collect" ? "Collect from the shop" : `Delivery, ${f.service.name}`;

/** Its price: "Free", or the rands. */
export const deliveryPrice = (cents: number) => (cents === 0 ? "Free" : rands(cents));
