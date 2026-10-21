import Link from "next/link";
import type { countOrders } from "@/lib/admin/orders";
import type { CheckRecord } from "@/lib/admin/payments";
import { whenInline } from "../when";
import { Alert, ArrowRight, Check } from "@/app/site/icons";

/** The stages still to work through, and what each asks of the shop. */
const STEPS = [
  { stage: "new", label: "New", fix: "Paid and waiting to be made" },
  { stage: "making", label: "Being made", fix: "Started; mark ready when done" },
  { stage: "ready", label: "Ready", fix: "Waiting to be collected or sent" },
] as const;

/**
 * Paid orders not yet done, by stage, and orders with something to look at
 * (a payment that didn't match, or money taken twice), which come first.
 */
export function OrdersToDo({ counts, check, now }: { counts: Awaited<ReturnType<typeof countOrders>>; check: CheckRecord | null; now: string }) {
  const todo = STEPS.reduce((n, s) => n + counts.stages[s.stage], 0);
  const look = counts.flagged;
  const lines = STEPS.map((s) => ({ ...s, count: counts.stages[s.stage] })).filter((s) => s.count > 0);

  return (
    <section className="widget" aria-labelledby="orders-title">
      <header className="widget__head">
        <h2 id="orders-title" className="widget__title">
          Orders to do
        </h2>
        {todo ? (
          <Link href="/admin/orders" className="widget__total" aria-label={`${todo} ${todo === 1 ? "order" : "orders"} to do, see them all`}>
            {todo}
            <ArrowRight size={18} />
          </Link>
        ) : null}
      </header>

      {todo === 0 && look === 0 ? (
        <p className="hidden__clear">
          <Check size={20} />
          Every paid order is done.
        </p>
      ) : (
        <ul className="hidden__list">
          {look ? (
            <li>
              <Link href="/admin/orders?view=look" className="hidden__row">
                <span className="hidden__why">
                  <Alert size={18} />
                  Needs a look
                </span>
                <span className="hidden__fix">A payment to check in PayFast</span>
                <span className="hidden__n">
                  {look}
                  <span className="visually-hidden">{look === 1 ? " order" : " orders"}</span>
                </span>
              </Link>
            </li>
          ) : null}
          {lines.map((s) => (
            <li key={s.stage}>
              <Link href="/admin/orders" className="hidden__row">
                <span className="hidden__why">{s.label}</span>
                <span className="hidden__fix">{s.fix}</span>
                <span className="hidden__n">
                  {s.count}
                  <span className="visually-hidden">{s.count === 1 ? " order" : " orders"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="widget__note dash__pay">
        <Link href="/admin/payments" className="admin-link">
          {!check
            ? "Payments not checked against PayFast yet"
            : !check.ok
              ? "PayFast couldn’t be read at the last check"
              : check.exceptions
                ? `${check.exceptions} ${check.exceptions === 1 ? "payment needs" : "payments need"} a look`
                : `Payments checked ${whenInline(check.at, now)}: all match`}
        </Link>
      </p>
    </section>
  );
}
