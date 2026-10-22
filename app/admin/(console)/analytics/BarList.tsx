/** One line of a bar list: what it is, its value as shown, and the number its bar is drawn from. */
export type Bar = { key: string; label: React.ReactNode; value: number; shown: string; detail?: string };

/**
 * A labelled list of bars, one series: each line's name and value in words,
 * with a thin bar under it against the largest. Every value is written out,
 * so nothing is read from the bar alone.
 */
export function BarList({ bars, label, mono = false }: { bars: Bar[]; label: string; mono?: boolean }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <ul className="bars" aria-label={label}>
      {bars.map((b) => (
        <li key={b.key} className="bars__row">
          <span className={mono ? "bars__label mono" : "bars__label"}>{b.label}</span>
          <span className="bars__value">
            {b.shown}
            {b.detail ? <span className="bars__detail"> {b.detail}</span> : null}
          </span>
          <span className="bars__track" aria-hidden="true">
            <span className="bars__fill" style={{ width: `${Math.max(1.5, (b.value / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
