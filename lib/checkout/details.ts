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
export const LIMITS = { name: 100, email: 100, line: 120, notes: 200 } as const;

/** "0764912300" from "076 491 2300", "+27 76 491 2300" or "27764912300"; null when it is not a mobile number. */
export function nationalPhone(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, "").replace(/^\+/, "");
  const national = digits.startsWith("27") ? `0${digits.slice(2)}` : digits;
  return /^0[6-8]\d{8}$/.test(national) ? national : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s: string) => EMAIL.test(s.trim());

/** The shortest password a customer account takes; Firebase's own floor is 6. */
export const PASSWORD_MIN = 8;

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
  else if (!nationalPhone(c.phone)) e.phone = "Use a South African mobile number, like 076 491 2300.";
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

/** Trimmed, with the phone in its national form: what is stored and sent on. */
export function cleanContact(c: Contact): Contact {
  return {
    firstName: c.firstName.trim(),
    lastName: c.lastName.trim(),
    email: c.email.trim().toLowerCase(),
    phone: nationalPhone(c.phone) ?? c.phone.trim(),
  };
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

export function readAddress(x: unknown): Address | null {
  const a = x as Record<string, unknown> | null;
  if (!a || typeof a !== "object") return null;
  const keys = ["street", "suburb", "city", "province", "code", "notes"] as const;
  if (!keys.every((k) => typeof a[k] === "string")) return null;
  if (a.province !== "" && !PROVINCES.includes(a.province as (typeof PROVINCES)[number])) return null;
  return Object.fromEntries(keys.map((k) => [k, a[k]])) as Address;
}

/** "10 Midas Ave, Olympus, Pretoria, 0081". */
export const addressLine = (a: Address) => [a.street, a.suburb, a.city, a.code].filter(Boolean).join(", ");
