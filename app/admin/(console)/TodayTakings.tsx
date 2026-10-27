import Link from "next/link";
import type { Takings } from "@/lib/admin/dashboard";
import { plural, rands } from "@/lib/catalog/listing";
import { ArrowRight } from "@/app/site/icons";

const sale = (t: Takings) => `${plural(t.orders, "order", "orders")}, ${rands(t.amount)}`;

/**
 * What has been paid today, set against what had been paid by this time
 * yesterday, so a quiet morning is not read as a slow day. Refunds and the
 * month are the Analytics page's.
 */
export function TodayTakings({ today, yesterday }: { today: Takings; yesterday: Takings }) {
  return (
    <section className="widget" aria-labelledby="today-title">
      <header className="widget__head">
        <h2 id="today-title" className="widget__title">
          Paid today
        </h2>
      </header>
      <div className="today">
        {today.orders ? (
          <>
            <p className="today__amount mono">{rands(today.amount)}</p>
            <p className="today__orders">from {plural(today.orders, "order", "orders")}</p>
          </>
        ) : (
          <p className="today__orders">No orders paid yet today.</p>
        )}
        {yesterday.orders ? <p className="widget__note today__then">By this time yesterday: {sale(yesterday)}.</p> : null}
      </div>
      <p className="widget__note dash__pay">
        <Link href="/admin/analytics" className="admin-link">
          This month’s takings <ArrowRight size={16} />
        </Link>
      </p>
    </section>
  );
}
