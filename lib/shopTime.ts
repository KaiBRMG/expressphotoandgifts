/**
 * The shop's own time, South African Standard Time: UTC+2 all year, with no
 * daylight saving. One place for it, so the admin's dates, PayFast's API
 * timestamps and its transaction history all read the same clock.
 */

export const SHOP_TZ = "Africa/Johannesburg";

/** SAST's distance from UTC. */
export const OFFSET_MS = 2 * 3600_000;

const DAY_MS = 86_400_000;

/** Midnight in the shop's time, as an instant, on the day of a moment. */
export const shopMidnight = (ms: number) => Math.floor((ms + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS;

/** An instant as a `datetime-local` value in the shop's time ("2026-12-24T23:59"); "" for none. */
export const toShopLocal = (iso: string | null) => (iso ? new Date(Date.parse(iso) + OFFSET_MS).toISOString().slice(0, 16) : "");

/** A `datetime-local` value read as the shop's time, as an instant; null when empty. */
export const fromShopLocal = (v: string) => (v ? new Date(Date.parse(`${v}:00Z`) - OFFSET_MS).toISOString() : null);

/** The shop's calendar date, YYYY-MM-DD, of a moment (now by default). */
export const shopDate = (ms = Date.now()) => new Date(ms + OFFSET_MS).toISOString().slice(0, 10);

/** "2026-10-21T06:00:00+02:00": now, as PayFast's API timestamp header takes it. */
export const shopTimestamp = () => `${new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 19)}+02:00`;

/** A time PayFast writes in the shop's zone ("2026-10-20 22:12:02") as a Date. */
export const fromShopTime = (s: string) => new Date(`${s.replace(" ", "T")}+02:00`);

/** The month `by` months on from this one ("2026-10", -1 → "2026-09"). */
export const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};

/** How many days a month ("2026-10") has. */
export const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** A month as a pair of instants: its first midnight in the shop's time, and the next month's. */
export const monthBounds = (month: string) => ({
  start: new Date(Date.parse(`${month}-01T00:00:00Z`) - OFFSET_MS).toISOString(),
  end: new Date(Date.parse(`${shiftMonth(month, 1)}-01T00:00:00Z`) - OFFSET_MS).toISOString(),
});
