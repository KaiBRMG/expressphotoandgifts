import { SHOP } from "@/app/site/data";
import { isEmail, LIMITS, nationalPhone, phoneProblem } from "@/lib/checkout/details";

/**
 * How the public reaches the shop: the email and number every page, email, PDF
 * and link states. The admin's Settings sets them (`lib/settings.ts`); until it
 * has, they are the shop's own, in `SHOP`.
 *
 * The number is a South African mobile, because the same number takes calls and
 * WhatsApp (`whatsappLink`) and is the shop's contact on a courier waybill.
 */
export type ShopContact = {
  email: string;
  /** "0764912300", the national form. */
  phone: string;
  /** "076 491 2300", as it reads. */
  phoneDisplay: string;
  /** "27764912300", for `tel:+` and wa.me. */
  phoneE164: string;
};

const DEFAULT_PHONE = nationalPhone(SHOP.phoneDisplay) ?? "";

export const DEFAULT_CONTACT: ShopContact = { email: SHOP.email, phone: DEFAULT_PHONE, phoneDisplay: SHOP.phoneDisplay, phoneE164: SHOP.phoneE164 };

/** What Settings keeps and edits: the email and the national number. */
export type ContactInput = Pick<ShopContact, "email" | "phone">;

/** What saving them says: the saved fields, or what is wrong and with which field. */
export type SaveContactResult = { ok: true; input: ContactInput } | { error: string; field?: keyof ContactInput };

const spaced = (n: string) => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;

const build = (email: string, phone: string): ShopContact => ({ email, phone, phoneDisplay: spaced(phone), phoneE164: `27${phone.slice(1)}` });

/** The shop's contact from what was stored, each part falling back to the default when missing or no longer valid. */
export function readContact(raw: unknown): ShopContact {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const email = typeof r.email === "string" && isEmail(r.email) ? r.email.trim().toLowerCase() : DEFAULT_CONTACT.email;
  const phone = typeof r.phone === "string" ? nationalPhone(r.phone) : null;
  return build(email, phone ?? DEFAULT_PHONE);
}

/** Checks what Settings sent, naming the field that is wrong. */
export function checkContact(raw: unknown): SaveContactResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (typeof r.email !== "string" || typeof r.phone !== "string") return { error: "Something went wrong reading that. Reload the page and try again." };
  const email = r.email.trim().toLowerCase();
  if (!isEmail(email) || email.length > LIMITS.email) return { error: "That doesn’t look like an email address.", field: "email" };
  const phone = nationalPhone(r.phone);
  if (!phone) return { error: phoneProblem(r.phone, "The shop’s number needs to take WhatsApp, so use a mobile.") ?? "That isn’t a South African mobile number.", field: "phone" };
  return { ok: true, input: { email, phone } };
}

/** A WhatsApp link to the shop with the message already written. */
export const whatsappLink = (c: ShopContact, message: string) => `https://wa.me/${c.phoneE164}?text=${encodeURIComponent(message)}`;

/** The chat the dock and footer open. */
export const chatHref = (c: ShopContact) => whatsappLink(c, "Hi! I have a question about…");
