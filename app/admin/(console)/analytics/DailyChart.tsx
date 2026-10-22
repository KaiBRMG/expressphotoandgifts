"use client";

import { dayTicks, tipAt, useDayCursor, useWidth } from "./chart";
import { dayLabel, niceTicks, numbered } from "./format";

type Day = { day: number; visitors: number; pageviews: number };

const H = 180;
const PAD = { top: 10, right: 8, bottom: 30, left: 44 };

/** Visitors each day of the month, one column a day; each column reads its day on hover, tap or focus. */
export function DailyChart({ month, days, length }: { month: string; days: Day[]; length: number }) {
  const [box, width] = useWidth<HTMLDivElement>();
  const { active, setActive, onKeyDown, onBlur } = useDayCursor(length, 0);

  const byDay = new Map(days.map((d) => [d.day, d]));
  const ticks = niceTicks(Math.max(0, ...days.map((d) => d.visitors)));
  const high = ticks[ticks.length - 1] || 1;
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / length;
  const bar = Math.max(2, Math.min(24, slot - 2));
  const y = (v: number) => PAD.top + plotH - (v / high) * plotH;
  const at = active ? (byDay.get(active) ?? { day: active, visitors: 0, pageviews: 0 }) : null;
  const busiest = days.reduce<Day | null>((b, d) => (!b || d.visitors > b.visitors ? d : b), null);

  return (
    <div
      ref={box}
      className="daily"
      tabIndex={0}
      role="img"
      aria-label={`Visitors each day${busiest ? `; the busiest was ${dayLabel(month, busiest.day)}, with ${numbered(busiest.visitors, "visitor", "visitors")}` : ""}. Use the arrow keys to read a day.`}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
    >
      <svg width={width} height={H} aria-hidden="true">
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end">
              {t.toLocaleString("en-ZA")}
            </text>
          </g>
        ))}
        {Array.from({ length }, (_, i) => {
          const day = i + 1;
          const v = byDay.get(day)?.visitors ?? 0;
          const cx = PAD.left + slot * i + slot / 2;
          const top = y(v);
          const hgt = PAD.top + plotH - top;
          const r = Math.min(4, hgt, bar / 2);
          return (
            <g key={day} className={active === day ? "daily__col daily__col--on" : "daily__col"}>
              {v > 0 ? (
                <path
                  className="daily__bar"
                  d={`M${cx - bar / 2},${PAD.top + plotH}V${top + r}Q${cx - bar / 2},${top} ${cx - bar / 2 + r},${top}H${cx + bar / 2 - r}Q${cx + bar / 2},${top} ${cx + bar / 2},${top + r}V${PAD.top + plotH}Z`}
                />
              ) : null}
              <rect className="daily__hit" x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH} onPointerEnter={() => setActive(day)} onPointerDown={() => setActive(day)} />
            </g>
          );
        })}
        {dayTicks(length).map((d) => (
          <text key={d} className="chart-tick" x={PAD.left + slot * (d - 1) + slot / 2} y={H - 8} textAnchor="middle">
            {d}
          </text>
        ))}
      </svg>
      {at ? (
        <div className="pace__tip pace__tip--light" style={{ left: tipAt(PAD.left + slot * (at.day - 1) + slot / 2, width, 80) }} role="status">
          <p className="pace__tipDay">{dayLabel(month, at.day)}</p>
          <p className="pace__tipRow">
            <strong>{numbered(at.visitors, "visitor", "visitors")}</strong>
          </p>
          <p className="pace__tipRow">{numbered(at.pageviews, "page view", "page views")}</p>
        </div>
      ) : null}
    </div>
  );
}
