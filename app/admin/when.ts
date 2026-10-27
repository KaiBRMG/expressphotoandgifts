import { DAY_MS } from "@/lib/checkout/order";
import { SHOP_TZ as TZ } from "@/lib/shopTime";

/* In the shop's own time zone, so the server's render and the browser's agree. */
const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const date = (d: Date) => d.toLocaleDateString("en-ZA", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const time = (d: Date) => d.toLocaleTimeString("en-ZA", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** "Today", "Yesterday", "3 Oct 2026": a day, for facts that don't need the hour. */
export function whenDay(iso: string, nowIso: string): string {
  const d = new Date(iso);
  const now = new Date(nowIso);
  if (day(d) === day(now)) return "Today";
  if (day(d) === day(new Date(now.getTime() - DAY_MS))) return "Yesterday";
  return date(d);
}

/** "Today, 14:05", "Yesterday", "3 Oct 2026", against the server's clock. */
export function when(iso: string, nowIso: string): string {
  const d = new Date(iso);
  const now = new Date(nowIso);
  if (day(d) === day(now)) return `Today, ${time(d)}`;
  if (day(d) === day(new Date(now.getTime() - DAY_MS))) return "Yesterday";
  return date(d);
}

/** "3 Oct 2026, 14:05": a moment exactly, for records. */
export const at = (iso: string) => `${date(new Date(iso))}, ${time(new Date(iso))}`;

/** `when`, mid-sentence: "checked today, 06:00", "checked 3 Oct 2026". */
export const whenInline = (iso: string, nowIso: string) => when(iso, nowIso).replace(/^(Today|Yesterday)/, (w) => w.toLowerCase());

/** "24 Dec": a day, without its year. */
export const dayMonth = (d: Date) => d.toLocaleDateString("en-ZA", { timeZone: TZ, day: "numeric", month: "short" });

/** "20 Oct, 22:12": a moment this year, for a ledger row. */
export const short = (d: Date) => `${d.toLocaleDateString("en-ZA", { timeZone: TZ, day: "numeric", month: "short" })}, ${time(d)}`;

/** "under an hour", "5 hours", "1 day", "3 days": how long it has been since a moment, as a span to read after "waiting". */
export function waited(iso: string, nowIso: string): string {
  const hours = Math.max(0, Math.floor((Date.parse(nowIso) - Date.parse(iso)) / 3600_000));
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}
