import Link from "next/link";
import { phaseOf, type Campaign } from "@/lib/catalog/campaigns";
import { DAY_MS as DAY } from "@/lib/checkout/order";
import { OFFSET_MS, shopMidnight } from "@/lib/shopTime";
import { dayOf } from "./model";

/** A week behind, ten ahead: what was just on, and the season being planned. */
const BEFORE = 7;
const DAYS = 77;

/**
 * The coming weeks as a strip: each campaign a bar from its start to its end,
 * the gifting days the shop plans for marked across it, and today. Overlaps
 * and gaps before a season read at a glance. A picture of the list under it,
 * which says everything in words, so screen readers skip it; a phone gets
 * the list alone.
 */
export function Timeline({ campaigns, seasons, now }: { campaigns: Campaign[]; seasons: { value: string; label: string; at: string }[]; now: string }) {
  const t = Date.parse(now);
  const start = shopMidnight(t) - BEFORE * DAY;
  const end = start + DAYS * DAY;
  const pos = (ms: number) => Math.min(100, Math.max(0, ((ms - start) / (end - start)) * 100));

  const rows = campaigns
    .map((c) => {
      const phase = phaseOf(c, t);
      const s = c.startsAt ? Date.parse(c.startsAt) : c.status === "draft" ? null : Date.parse(c.createdAt);
      const e = c.endsAt ? Date.parse(c.endsAt) : c.endedAt ? Date.parse(c.endedAt) : null;
      return { c, phase, s, e };
    })
    // A draft shows once it has dates; anything else while it touches the strip.
    .filter((r) => r.s !== null && r.s < end && (r.e === null || r.e > start) && !(r.phase === "draft" && !r.c.endsAt))
    .sort((a, b) => a.s! - b.s!);

  // Mondays, for the scale.
  const weeks: number[] = [];
  for (let d = start; d < end; d += DAY) if (new Date(d + OFFSET_MS).getUTCDay() === 1) weeks.push(d);
  const marks = seasons.map((s) => ({ ...s, ms: Date.parse(s.at) })).filter((s) => s.ms >= start && s.ms < end);

  return (
    <section className="tline" aria-hidden="true">
      <div className="tline__scale">
        {weeks.map((w) => (
          <span key={w} className="tline__week" style={{ left: `${pos(w)}%` }}>
            {dayOf(new Date(w).toISOString())}
          </span>
        ))}
      </div>
      <div className="tline__field">
        {marks.map((m) => (
          <span key={m.value} className="tline__season" style={{ left: `${pos(m.ms)}%` }}>
            <span className="tline__seasonName">{m.label}</span>
          </span>
        ))}
        <span className="tline__today" style={{ left: `${pos(t)}%` }}>
          <span className="tline__todayName">Today</span>
        </span>
        {rows.length ? (
          <ul className="tline__rows">
            {rows.map(({ c, phase, s, e }) => {
              const left = pos(s!);
              const right = e === null ? 100 : pos(e);
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/campaigns/${c.id}`}
                    tabIndex={-1}
                    className={`tline__bar tline__bar--${phase}${e === null ? " tline__bar--open" : ""}`}
                    style={{ left: `${left}%`, width: `max(${right - left}%, 6px)` }}
                    title={c.name}
                  >
                    <span>{c.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="tline__none">Nothing scheduled in these weeks.</p>
        )}
      </div>
    </section>
  );
}
