import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getVocabulary } from "@/lib/catalog/queries";
import { workQueue, takings } from "@/lib/admin/dashboard";
import { lastCheck } from "@/lib/admin/payments";
import { listProducts } from "@/lib/admin/products";
import { readLevels, stockRows } from "@/lib/admin/stock";
import { courierReady } from "@/lib/checkout/courier";
import { payfastStatus } from "@/lib/checkout/payfastApi";
import { shopContact } from "@/lib/settings";
import { SHOP } from "@/app/site/data";
import { getCartDeals } from "@/lib/campaigns";
import { inWindow } from "@/lib/catalog/campaigns";
import { plural } from "@/lib/catalog/listing";
import { stockState } from "@/lib/catalog/stock";
import { CourierCard } from "./CourierCard";
import { DealsGlance } from "./DealsGlance";
import { HeldUp } from "./HeldUp";
import { HiddenProducts } from "./HiddenProducts";
import { NeedsDoing } from "./NeedsDoing";
import { PayfastStatusNotice } from "./PayfastStatusNotice";
import { RunningLow } from "./RunningLow";
import { TodayTakings } from "./TodayTakings";

export const metadata: Metadata = { title: "Dashboard" };

/** Booking the courier for a day's orders asks The Courier Guy for each in turn, a few at a time: more than a page's usual seconds. */
export const maxDuration = 60;

/**
 * The console's first page, for whoever is at the counter: the work queue
 * first (what needs a look, what has waited longest, what is at each stage),
 * beside it the courier (where the day's deliveries are, and the button that
 * books the collection), what has stalled and today's takings, then the shop's housekeeping
 * (stock, deals, hidden products) in a quieter row below.
 */
export default async function Dashboard() {
  await requireAdmin();
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const [products, vocabulary, queue, check, status, levels, deals, sales, reach] = await Promise.all([
    listProducts(),
    getVocabulary(),
    workQueue(nowMs),
    lastCheck(),
    payfastStatus(),
    readLevels({ trackedOnly: true }),
    getCartDeals(),
    takings(nowMs),
    shopContact(),
  ]);

  const rows = stockRows(products, levels);
  const lowSkus = rows.flatMap((r) => (r.level && ["low", "out"].includes(stockState(r.level)) ? [r.sku] : []));
  const live = deals.filter((c) => inWindow(c, nowMs));

  const { todo, look } = queue;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__lede">
            {todo ? `${plural(todo, "order", "orders")} to make or hand over.` : "Every paid order is done."}
            {look.length ? ` ${look.length} ${look.length === 1 ? "needs" : "need"} a look.` : ""}
          </p>
        </div>
      </header>

      <PayfastStatusNotice status={status} />

      <div className="dash">
        <div className={`dash__top${queue.collect.length ? "" : " dash__top--clear"}`}>
          <NeedsDoing queue={queue} check={check} now={now} />
          <CourierCard desk={queue.courier} configured={courierReady()} live={Boolean(process.env.TCG_WEBHOOK_SECRET?.trim())} shop={{ address: `${SHOP.street}, ${SHOP.town}`, phone: reach.phone }} now={now} />
          <HeldUp collect={queue.collect} now={now} />
          <TodayTakings today={sales.today} yesterday={sales.yesterday} />
        </div>
        <div className="dash__more">
          <RunningLow rows={rows} deals={live} />
          <DealsGlance deals={deals} lowSkus={lowSkus} now={now} />
          <HiddenProducts products={products} vocabulary={vocabulary} />
        </div>
      </div>
    </div>
  );
}
