import type { ReactNode } from "react";
import { plural } from "@/lib/catalog/listing";
import { COURIER_TROUBLE, statusText } from "@/lib/checkout/order";
import type { Awaiting, CourierDesk } from "@/lib/admin/dashboard";
import { shopDate } from "@/lib/shopTime";
import { Alert, Printer, Truck } from "@/app/site/icons";
import { whenInline } from "../when";
import { BookCollection } from "./BookCollection";
import { GlanceRow } from "./GlanceRow";
import { LiveRefresh } from "./LiveRefresh";

/** "Tue 28 Oct", from a shop date. */
const dayText = (date: string) => new Date(`${date}T12:00:00+02:00`).toLocaleDateString("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" });

/** When a booking asked the courier to come: "Tue 28 Oct, 10:00 to 14:00", or the courier's next round when no day was set. */
function whenText(b: Pick<Awaiting, "date" | "after" | "before">, today: string) {
  const day = b.date ? (b.date === today ? "today" : dayText(b.date)) : "on The Courier Guy’s next round";
  const hours = b.after || b.before ? `${b.after ?? "any time"} to ${b.before ?? "any time"}` : "";
  return [day, hours].filter(Boolean).join(", ");
}

/** The bookings made for one day and window, in the order the days fall. */
function groups(booked: Awaiting[], today: string) {
  const by = new Map<string, { when: string; orders: number; parcels: number }>();
  for (const b of booked) {
    const key = `${b.date}|${b.after}|${b.before}`;
    const g = by.get(key) ?? { when: whenText(b, today), orders: 0, parcels: 0 };
    g.orders++;
    g.parcels += b.parcels;
    by.set(key, g);
  }
  return [...by.values()];
}

/** What the card says first: whether a courier is coming, in one line and its detail. `tone` colours the mark: calm is blue, `bad` is red. */
function status(desk: CourierDesk, configured: boolean, today: string): { lead: string; detail: ReactNode; tone: "calm" | "bad" } {
  const { booked, ready, making } = desk;
  if (!configured) return { lead: "The Courier Guy isn’t set up", detail: "Set TCG_API_KEY where the site is hosted, then reload, to book a collection.", tone: "bad" };

  if (booked.length) {
    const late = booked.filter((b) => b.late);
    if (late.length) {
      return {
        lead: "The courier is overdue",
        detail: `${plural(late.length, "order", "orders")} booked for ${whenText(late[0], today)} ${late.length === 1 ? "hasn’t" : "haven’t"} been collected. Call The Courier Guy.`,
        tone: "bad",
      };
    }
    const trouble = booked.filter((b) => b.status && b.status in COURIER_TROUBLE);
    if (trouble.length) {
      return {
        lead: "The courier hit a problem",
        detail: `${statusText(trouble[0].status!)}${trouble.length > 1 ? ` and ${plural(trouble.length - 1, "other", "others")}` : ""}. It is flagged on the order, with the next step.`,
        tone: "bad",
      };
    }
    const g = groups(booked, today);
    const assigned = booked.some((b) => b.status === "collection-assigned");
    return {
      lead: assigned ? "A driver is assigned" : "A courier is booked",
      detail: g.map((x) => `Collecting ${x.when}: ${plural(x.parcels, "parcel", "parcels")} from ${plural(x.orders, "order", "orders")}.`).join(" "),
      tone: "calm",
    };
  }
  if (ready.length) {
    const parcels = ready.reduce((n, o) => n + o.parcels, 0);
    return {
      lead: "No courier is booked",
      detail: `${plural(ready.length, "order is", "orders are")} packed and waiting (${plural(parcels, "parcel", "parcels")}).${making ? ` ${plural(making, "order is", "orders are")} still being made.` : ""} Book a collection when there are enough.`,
      tone: "calm",
    };
  }
  if (desk.unpacked.length) return { lead: "Nothing is ready to book", detail: `${plural(desk.unpacked.length, "order is", "orders are")} marked ready to send without parcels saved. Save their boxes and weights.`, tone: "calm" };
  if (desk.collectedToday) return { lead: "Collected today", detail: `${plural(desk.collectedToday, "order has", "orders have")} left with the courier today.${making ? ` ${plural(making, "order is", "orders are")} still being made.` : ""}`, tone: "calm" };
  return { lead: "Nothing to send", detail: making ? `${plural(making, "order is", "orders are")} still being made.` : "Every delivery is with the courier.", tone: "calm" };
}

/**
 * The dashboard's courier desk. Orders are packed and marked ready to send
 * through the day without the courier being called; here is where the courier
 * is: whether one is coming, how many orders are ready and how many are still
 * being made, and the one button that books a collection for all that are
 * ready (`BookCollection`), after showing which. Waybills to print stay below
 * until the courier has collected.
 */
export function CourierCard({ desk, configured, live, shop, now }: { desk: CourierDesk; configured: boolean; live: boolean; shop: { address: string; phone: string }; now: string }) {
  const today = shopDate(Date.parse(now));
  const { ready, unpacked, booked } = desk;
  const s = status(desk, configured, today);
  const read = booked.flatMap((b) => (b.checkedAt ? [b.checkedAt] : [])).sort().at(-1);

  return (
    <section className="widget" aria-labelledby="courier-title">
      {booked.length ? <LiveRefresh /> : null}
      <header className="widget__head">
        <h2 id="courier-title" className="widget__title">
          The courier
        </h2>
      </header>

      <div className={`courier__status${s.tone === "bad" ? " courier__status--bad" : ""}`} role="status">
        <span className="courier__mark" aria-hidden="true">
          {s.tone === "bad" ? <Alert size={22} /> : <Truck size={22} />}
        </span>
        <p className="courier__lead">{s.lead}</p>
        <p className="courier__detail">{s.detail}</p>
      </div>

      {booked.length || unpacked.length ? (
        <ul className="hidden__list">
          {booked.length ? (
            <GlanceRow href="/admin/orders?stage=ready" icon={null} title="Waiting for the courier" text="Booked, not yet collected" end={booked.length} open={booked.length === 1 ? " order" : " orders"} />
          ) : null}
          {unpacked.length ? (
            <GlanceRow
              href={`/admin/orders/${unpacked[0].ref}`}
              icon={<Alert size={18} />}
              title="No parcels saved"
              text={`${plural(unpacked.length, "order", "orders")} marked ready to send without boxes or weights. Left out of the booking.`}
              end={unpacked.length}
              open={unpacked.length === 1 ? " order" : " orders"}
            />
          ) : null}
        </ul>
      ) : null}

      {booked.length ? (
        <p className="widget__note">
          {live ? "The Courier Guy reports here as it happens." : "The Courier Guy’s live updates are off, so this is read once a day. Set TCG_WEBHOOK_SECRET to turn them on."}
          {read ? ` Last heard ${whenInline(read, now)}.` : ""}
        </p>
      ) : null}

      <BookCollection ready={ready} unpacked={unpacked} configured={configured} shop={shop} />

      {booked.length ? (
        <details className="courier__labels">
          <summary>Waybills and stickers to print ({booked.length})</summary>
          <ul className="courier__list">
            {booked.map((b) => (
              <li key={b.ref}>
                <span className="courier__who">
                  <span>{b.name}</span>
                  <span className="courier__track">
                    <span className="mono">{b.tracking}</span> · {b.status ? statusText(b.status) : "Waiting for the courier"}
                  </span>
                </span>
                <span className="courier__links">
                  <a className="obtn" href={`/admin/orders/${b.ref}/label?which=out&kind=waybill`} target="_blank" rel="noopener">
                    <Printer size={18} /> Waybill
                  </a>
                  <a className="obtn" href={`/admin/orders/${b.ref}/label?which=out&kind=stickers`} target="_blank" rel="noopener">
                    <Printer size={18} /> Stickers
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
