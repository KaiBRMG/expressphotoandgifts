/**
 * The shop's own time, South African Standard Time: UTC+2 all year, with no
 * daylight saving. One place for it, so the admin's dates, PayFast's API
 * timestamps and its transaction history all read the same clock.
 */

export const SHOP_TZ = "Africa/Johannesburg";

const OFFSET_MS = 2 * 3600_000;

/** The shop's calendar date, YYYY-MM-DD, of a moment (now by default). */
export const shopDate = (ms = Date.now()) => new Date(ms + OFFSET_MS).toISOString().slice(0, 10);

/** "2026-10-21T06:00:00+02:00": now, as PayFast's API timestamp header takes it. */
export const shopTimestamp = () => `${new Date(Date.now() + OFFSET_MS).toISOString().slice(0, 19)}+02:00`;

/** A time PayFast writes in the shop's zone ("2026-10-20 22:12:02") as a Date. */
export const fromShopTime = (s: string) => new Date(`${s.replace(" ", "T")}+02:00`);
