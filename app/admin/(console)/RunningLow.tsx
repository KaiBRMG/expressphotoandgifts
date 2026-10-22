import Link from "next/link";
import { campaignsFor, type LiveCampaign } from "@/lib/catalog/campaigns";
import { orderWhat } from "@/lib/catalog/purchase";
import { stockState, STATE_LABELS } from "@/lib/catalog/stock";
import type { StockRow } from "@/lib/admin/stock";
import { Alert, ArrowRight, Check, Tag } from "@/app/site/icons";

/** How many sizes the card lists before it points to the page. */
const SHOWN = 6;

/**
 * Tracked sizes at or under their Low level, sold out first: each a way to
 * the Stock page, where a delivery is received. Untracked sizes never show.
 * One a live campaign is selling says so, since it is the likeliest to run out.
 */
export function RunningLow({ rows, deals = [] }: { rows: StockRow[]; deals?: LiveCampaign[] }) {
  const tracked = rows.flatMap((r) => (r.level?.tracked ? [{ r, level: r.level, state: stockState(r.level) }] : []));
  const low = tracked
    .filter((x) => x.state === "low" || x.state === "out")
    .sort((a, b) => Number(b.state === "out") - Number(a.state === "out") || a.level.onHand - b.level.onHand);

  return (
    <section className="widget" aria-labelledby="low-title">
      <header className="widget__head">
        <h2 id="low-title" className="widget__title">
          Running low
        </h2>
        {low.length ? (
          <Link href="/admin/stock?show=low" className="widget__total" aria-label={`${low.length} ${low.length === 1 ? "size" : "sizes"} low or sold out, see them all`}>
            {low.length}
            <ArrowRight size={18} />
          </Link>
        ) : null}
      </header>

      {tracked.length === 0 ? (
        <p className="hidden__clear">
          <Check size={20} />
          <span>
            No stock is tracked, so everything can be ordered. <Link href="/admin/stock" className="admin-link">Track stock</Link>
          </span>
        </p>
      ) : low.length === 0 ? (
        <p className="hidden__clear">
          <Check size={20} />
          Every tracked size is above its Low level.
        </p>
      ) : (
        <ul className="hidden__list">
          {low.slice(0, SHOWN).map(({ r, level, state }) => (
            <li key={r.sku}>
              <Link href={`/admin/stock?q=${encodeURIComponent(r.sku)}`} className="hidden__row">
                <span className="hidden__why">
                  <Alert size={18} />
                  {orderWhat(r.product, r.variant)}
                  {campaignsFor(r.sku, deals).length ? (
                    <span className="hidden__deal">
                      <Tag size={16} />
                      On deal
                    </span>
                  ) : null}
                </span>
                <span className="hidden__fix">{STATE_LABELS[state]}</span>
                <span className="hidden__n">
                  {level.onHand}
                  <span className="visually-hidden"> on hand</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {low.length > SHOWN ? <p className="widget__note">And {low.length - SHOWN} more on the Stock page.</p> : null}
    </section>
  );
}
