/**
 * Gift wrapping: an optional service the customer ticks on each cart line at
 * checkout, charged per unit, never part of the goods. It stays outside the
 * campaigns (no deal or spend threshold counts it), outside the value
 * declared to the courier and outside the delivery quote, and it goes back
 * with its unit when that unit is refunded (`linePaid` in
 * `lib/checkout/refunds.ts`). The order keeps what each line was charged
 * (`OrderLine.wrap`), so changing the price later never changes an old order.
 */

/** Cents per wrapped unit, VAT inclusive. */
export const GIFT_WRAP = 4000;

/** What a line's wrapping comes to: its price per unit, once per unit. Zero when it isn't wrapped. */
export const lineWrap = (l: { wrap?: number; quantity: number }) => (l.wrap ?? 0) * l.quantity;

/** Everything wrapped on an order, in cents. */
export const wrapTotal = (lines: { wrap?: number; quantity: number }[]) => lines.reduce((n, l) => n + lineWrap(l), 0);

/** How the order says it, where there's room for a few words. */
export const WRAP_WORDS = "Gift wrapped";

/** The shop's words on its gift wrapping, as the owner wrote them: shown on the product page and at checkout. */
export const WRAP_STORY =
  "Wrapped in organic, biodegradable brown paper and finished with an organza bow, this gift box pairs a natural textured finish with an elegant touch. Add a personalised message on the gift tag to make it yours. Perfect for birthdays, thank-you gifts and special occasions.";

/** What a line's note is called: on a wrapped line it is what goes on the gift tag. */
export const noteLabel = (l: { wrap?: number }) => (l.wrap ? "Gift tag message" : "Note");

/** "Gift wrapped, R40 each" for the line's detail under its name; empty when it isn't wrapped. */
export const wrapDetail = (l: { wrap?: number }, money: (cents: number) => string) => (l.wrap ? `Gift wrapped, ${money(l.wrap)} each` : "");
