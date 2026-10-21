import { DAY_MS } from "@/lib/checkout/order";
import { SHOP_TZ as TZ } from "@/lib/shopTime";

/* In the shop's own time zone, so the server's render and the browser's agree. */
const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const date = (d: Date) => d.toLocaleDateString("en-ZA", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const time = (d: Date) => d.toLocaleTimeString("en-ZA", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

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

/** "20 Oct, 22:12": a moment this year, for a ledger row. */
export const short = (d: Date) => `${d.toLocaleDateString("en-ZA", { timeZone: TZ, day: "numeric", month: "short" })}, ${time(d)}`;
