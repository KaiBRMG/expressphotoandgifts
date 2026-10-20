import { DAY_MS } from "@/lib/checkout/order";

/** In the shop's own time zone, so the server's render and the browser's agree. */
const TZ = "Africa/Johannesburg";
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
