import Link from "next/link";
import type { WorkQueue } from "@/lib/admin/dashboard";
import type { CheckRecord } from "@/lib/admin/payments";
import { plural } from "@/lib/catalog/listing";
import { stageLabel } from "@/lib/checkout/order";
import { waited, whenInline } from "../when";
import { Hint } from "../Tip";
import { GlanceRow } from "./GlanceRow";
import { Alert, ArrowRight, Check } from "@/app/site/icons";

/** How many orders needing a look the card lists before it points to the Orders page. */
const LOOKS = 3;

/**
 * The page's one work queue: orders that need a look first, then the order
 * waiting longest (the next job, named, with how long it has waited), then
 * the paid orders not yet done, by stage. Each line is the door to its
 * orders, so the first thing to do is one tap from the top.
 */
export function NeedsDoing({ queue, check, now }: { queue: WorkQueue; check: CheckRecord | null; now: string }) {
  const { counts, todo, oldest, look } = queue;
  const stages = [
    { stage: "new", label: stageLabel("new", "collect"), fix: "Paid and waiting to be made", count: counts.new },
    { stage: "making", label: stageLabel("making", "collect"), fix: "Started; mark ready when done", count: counts.making },
    { stage: "ready", label: stageLabel("ready", "collect"), fix: "Waiting for the customer to come in", count: counts.readyCollect },
    { stage: "ready", label: stageLabel("ready", "courier"), fix: "Packed and waiting, or booked for collection", count: counts.readySend },
  ].filter((s) => s.count > 0);
  const toDo = `${plural(todo, "order", "orders")} to do`;
  const payments = check?.ok ? check.exceptions : 0;

  return (
    <section className="widget" aria-labelledby="queue-title">
      <header className="widget__head">
        <h2 id="queue-title" className="widget__title">
          Needs doing
        </h2>
        {todo ? (
          <Hint label={`${toDo}. See them all`}>
            <Link href="/admin/orders" className="widget__total" aria-label={`${toDo}, see them all`}>
              {todo}
              <ArrowRight size={18} />
            </Link>
          </Hint>
        ) : null}
      </header>

      {todo === 0 && look.length === 0 && !payments ? (
        <p className="hidden__clear">
          <Check size={20} />
          Every paid order is done.
        </p>
      ) : (
        <>
          {look.length || payments ? (
            <ul className="hidden__list queue__look">
              {payments ? (
                <GlanceRow href="/admin/payments" icon={<Alert size={18} />} title={plural(payments, "payment needs", "payments need") + " a look"} text="PayFast’s record and the orders disagree" open="See payments" />
              ) : null}
              {look.slice(0, LOOKS).map((l) => (
                <GlanceRow key={l.ref} href={`/admin/orders/${l.ref}`} icon={<Alert size={18} />} title={l.name} text={l.text} open="Open order" />
              ))}
              {look.length > LOOKS ? <GlanceRow href="/admin/orders?view=look" icon={<Alert size={18} />} title={`${look.length - LOOKS} more need a look`} open="See them all" /> : null}
            </ul>
          ) : null}

          {oldest ? (
            <Link href={`/admin/orders/${oldest.ref}`} className="queue__next">
              <span className="queue__main">
                <span className="queue__lead">Longest waiting</span>
                <span className="queue__who">{oldest.name}</span>
                <span className="queue__what">{oldest.what}</span>
              </span>
              <span className={`queue__age mono${oldest.late ? " queue__age--late" : ""}`}>
                {oldest.late ? <Alert size={18} /> : null}
                {waited(oldest.paidAt, now)}
              </span>
              <ArrowRight size={20} className="queue__go" />
            </Link>
          ) : null}

          <ul className="hidden__list">
            {stages.map((s) => (
              <GlanceRow
                key={s.label}
                href={`/admin/orders?stage=${s.stage}`}
                icon={null}
                title={<span className={`status ostage--${s.stage}`}>{s.label}</span>}
                text={s.fix}
                end={s.count}
                open={s.count === 1 ? " order" : " orders"}
              />
            ))}
          </ul>
        </>
      )}
      {payments ? null : (
        <p className="widget__note dash__pay">
          <Link href="/admin/payments" className="admin-link">
            {!check ? "Payments not checked against PayFast yet" : !check.ok ? "PayFast couldn’t be read at the last check" : `Payments checked ${whenInline(check.at, now)}: all match`}
          </Link>
        </p>
      )}
    </section>
  );
}
