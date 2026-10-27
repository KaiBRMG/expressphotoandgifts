/**
 * What a one-time deal code looks like, shared by the server that makes and
 * checks them (`lib/campaignCodes.ts`) and the pages that show them.
 */

/** 32 symbols without 0, O, 1 and I, which are mistaken for each other when read off an email. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 10;
const SHAPE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** "k7m4q 9xpd2" or "K7M4Q-9XPD2" → "K7M4Q9XPD2"; null when it can't be a code. */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.toUpperCase().replace(/[\s-]/g, "");
  return SHAPE.test(code) ? code : null;
}

/** "K7M4Q9XPD2" → "K7M4Q-9XPD2": how it is written in the email and at checkout. */
export const formatCode = (code: string) => `${code.slice(0, CODE_LENGTH / 2)}-${code.slice(CODE_LENGTH / 2)}`;
