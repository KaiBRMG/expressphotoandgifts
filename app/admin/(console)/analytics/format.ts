import { rands } from "@/lib/catalog/listing";

/** Whole rands, for figures that don't need cents: "R12 480". */
export const wholeRands = (cents: number) => rands(Math.round(cents / 100) * 100);

/** An axis tick: "R0", "R800", "R1.5K", "R12K". */
export function tickRands(cents: number) {
  const r = Math.round(cents / 100);
  if (Math.abs(r) < 1000) return `R${r}`;
  const k = r / 1000;
  return `R${Number.isInteger(k) || Math.abs(k) >= 10 ? Math.round(k) : k.toFixed(1)}K`;
}

/** Ticks from 0 to past `max`, about `count` of them, at a round step. */
export function niceTicks(max: number, count = 3): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= rough) ?? 10) * mag;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** "3 hours", "1.5 days": a median wait. */
export function waited(hours: number) {
  if (hours < 1) return "under an hour";
  if (hours < 36) return `${Math.round(hours)} ${Math.round(hours) === 1 ? "hour" : "hours"}`;
  const days = Math.round((hours / 24) * 2) / 2;
  return `${days} days`;
}

/** "62%", or "1.3%" under ten, where a whole number would hide the difference. */
export function percent(part: number, whole: number) {
  if (!whole) return "—";
  const p = (part / whole) * 100;
  return `${p > 0 && p < 10 ? p.toFixed(1).replace(/\.0$/, "") : Math.round(p)}%`;
}

/** "3 orders", "1 order": a count with its noun. */
export const numbered = (n: number, one: string, many: string) => `${n.toLocaleString("en-ZA")} ${n === 1 ? one : many}`;

/** "14 Oct": a day of a month ("2026-10"). */
export const dayLabel = (month: string, day: number) => new Date(`${month}-${String(day).padStart(2, "0")}T12:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" });
