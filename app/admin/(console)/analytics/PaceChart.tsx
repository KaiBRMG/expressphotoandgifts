"use client";

import type { PointerEvent } from "react";
import { dayTicks, tipAt, useDayCursor, useWidth } from "./chart";
import { dayLabel, niceTicks, tickRands, wholeRands } from "./format";

type Point = { day: number; now: number | null; before: number | null };

type Props = {
  pace: Point[];
  /** "2026-10" and "2026-09", for the day labels; their names for the legend. */
  month: string;
  previous: string;
  nowName: string;
  beforeName: string;
};

const H = 232;
const PAD = { top: 14, right: 16, bottom: 30, left: 52 };

/**
 * The month's takings as they built up, day by day, over the month before's:
 * amber for this month, the only amber on the page, and a quiet white for
 * the last. A crosshair finds the day under the pointer (or the arrow keys)
 * and reads both months there.
 */
export function PaceChart({ pace, month, previous, nowName, beforeName }: Props) {
  const [box, width] = useWidth<HTMLDivElement>();
  const days = pace.length;
  const lastNow = pace.findLast((p) => p.now !== null);
  const lastBefore = pace.findLast((p) => p.before !== null);
  const { active, setActive, onKeyDown, onBlur } = useDayCursor(days, lastNow?.day ?? 1);

  const values = pace.flatMap((p) => [p.now, p.before]).filter((v): v is number => v !== null);
  const ticks = niceTicks(Math.max(...values, 0));
  const low = Math.min(0, ...values);
  const high = ticks[ticks.length - 1] || 1;

  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (day: number) => PAD.left + ((day - 1) / Math.max(1, days - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - low) / (high - low)) * plotH;

  const path = (key: "now" | "before") =>
    pace
      .filter((p) => p[key] !== null)
      .map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p[key]!).toFixed(1)}`)
      .join("");

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const day = Math.round(((e.clientX - rect.left) / rect.width) * (days - 1)) + 1;
    setActive(Math.min(days, Math.max(1, day)));
  };

  const at = active ? pace[active - 1] : null;

  return (
    <div className="pace">
      <ul className="pace__legend" aria-hidden="true">
        <li>
          <span className="pace__key pace__key--now" />
          {nowName}
        </li>
        <li>
          <span className="pace__key pace__key--before" />
          {beforeName}
        </li>
      </ul>
      <div
        ref={box}
        className="pace__plot"
        tabIndex={0}
        role="img"
        aria-label={`Takings by day: ${nowName} ${lastNow ? `reached ${wholeRands(lastNow.now!)} by ${dayLabel(month, lastNow.day)}` : "has none yet"}; ${beforeName} ended at ${wholeRands(lastBefore?.before ?? 0)}. Use the arrow keys to read a day.`}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      >
        <svg width={width} height={H} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line className="chart-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="chart-tick" x={PAD.left - 10} y={y(t)} dy="0.35em" textAnchor="end">
                {tickRands(t)}
              </text>
            </g>
          ))}
          {dayTicks(days).map((d) => (
            <text key={d} className="chart-tick" x={x(d)} y={H - 8} textAnchor={d === days ? "end" : d === 1 ? "start" : "middle"}>
              {d}
            </text>
          ))}
          <path className="pace__line pace__line--before" d={path("before")} />
          <path className="pace__line pace__line--now" d={path("now")} />
          {lastNow && !at ? <circle className="pace__dot" cx={x(lastNow.day)} cy={y(lastNow.now!)} r={4.5} /> : null}
          {at ? (
            <g>
              <line className="pace__cross" x1={x(at.day)} x2={x(at.day)} y1={PAD.top} y2={PAD.top + plotH} />
              {at.before !== null ? <circle className="pace__dot pace__dot--before" cx={x(at.day)} cy={y(at.before)} r={4} /> : null}
              {at.now !== null ? <circle className="pace__dot" cx={x(at.day)} cy={y(at.now)} r={4.5} /> : null}
            </g>
          ) : null}
          <rect className="pace__hit" x={PAD.left} y={PAD.top} width={plotW} height={plotH} onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)} />
        </svg>
        {at ? (
          <div className="pace__tip" style={{ left: tipAt(x(at.day), width, 90) }} role="status">
            <p className="pace__tipDay">{dayLabel(month, at.day)}</p>
            <p className="pace__tipRow">
              <span className="pace__key pace__key--now" />
              <strong>{at.now === null ? "To come" : wholeRands(at.now)}</strong> {nowName}
            </p>
            <p className="pace__tipRow">
              <span className="pace__key pace__key--before" />
              <strong>{at.before === null ? "—" : wholeRands(at.before)}</strong> {beforeName}, {dayLabel(previous, Math.min(at.day, lastBefore?.day ?? at.day))}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
