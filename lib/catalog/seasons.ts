/**
 * The gifting days that fall on a date, as South Africa keeps them, so the
 * storefront can lead with the ones coming up. Occasions without a fixed day
 * (birthdays, weddings, matric and graduation) are never "coming up".
 */

import { OFFSET_MS } from "@/lib/shopTime";

/** How far ahead a day starts to lead: early enough to order, make and courier. */
const LEAD_DAYS = 70;

const DAY = 86_400_000;

/** The nth Sunday of a month (0-based month), at midnight UTC. */
function nthSunday(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return Date.UTC(year, month, 1 + ((7 - first) % 7) + (n - 1) * 7);
}

const DATES: Record<string, (year: number) => number> = {
  valentines: (y) => Date.UTC(y, 1, 14),
  "mothers-day": (y) => nthSunday(y, 4, 2),
  "fathers-day": (y) => nthSunday(y, 5, 3),
  christmas: (y) => Date.UTC(y, 11, 25),
};

/** Today in Johannesburg, at midnight UTC, so a day flips at the shop's midnight. */
function today(now: Date): number {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" })
    .format(now)
    .split("-")
    .map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * The occasions whose day is today or within the lead, soonest first, with
 * the days still to go.
 */
export function comingUp(now = new Date()): { value: string; days: number }[] {
  const t = today(now);
  const year = new Date(t).getUTCFullYear();
  return Object.entries(DATES)
    .map(([value, on]) => {
      const next = on(year) >= t ? on(year) : on(year + 1);
      return { value, days: Math.round((next - t) / DAY) };
    })
    .filter((o) => o.days <= LEAD_DAYS)
    .sort((a, b) => a.days - b.days);
}

/** Each dated occasion's next day, today's included, soonest first: `at` is its start, midnight in the shop's time. */
export function nextDays(now = new Date()): { value: string; at: number }[] {
  const t = today(now);
  const year = new Date(t).getUTCFullYear();
  // `today` keeps a shop date at midnight UTC; the shop's own midnight is its offset before it.
  return Object.entries(DATES)
    .map(([value, on]) => ({ value, at: (on(year) >= t ? on(year) : on(year + 1)) - OFFSET_MS }))
    .sort((a, b) => a.at - b.at);
}
