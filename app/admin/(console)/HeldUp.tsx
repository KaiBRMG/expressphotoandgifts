import type { WorkQueue } from "@/lib/admin/dashboard";
import { waited } from "../when";
import { GlanceRow } from "./GlanceRow";
import { Clock } from "@/app/site/icons";

/**
 * Collection orders left in Ready for days without the customer coming in.
 * Nothing here on a good day, so the card is not drawn at all. (Trouble the
 * courier reports is flagged on its order and so is under Needs doing.)
 */
export function HeldUp({ collect, now }: { collect: WorkQueue["collect"]; now: string }) {
  if (collect.length === 0) return null;

  return (
    <section className="widget" aria-labelledby="held-title">
      <header className="widget__head">
        <h2 id="held-title" className="widget__title">
          Not collected
        </h2>
      </header>
      <ul className="hidden__list">
        {collect.map((c) => (
          <GlanceRow key={c.ref} href={`/admin/orders/${c.ref}`} icon={<Clock size={18} />} title={c.name} text={`Ready to collect for ${waited(c.since, now)}.`} calm open="Open order" />
        ))}
      </ul>
    </section>
  );
}
