import Link from "next/link";
import { campaignsFor, inWindow, type LiveCampaign } from "@/lib/catalog/campaigns";
import { plural } from "@/lib/catalog/listing";
import { Hint } from "../Tip";
import { short, whenDay, whenInline } from "../when";
import { GlanceRow } from "./GlanceRow";
import { Alert, ArrowRight, Check, Tag } from "@/app/site/icons";

/** A campaign is "ending soon" when it ends within this long. */
const SOON_MS = 48 * 3600_000;

/** How many campaigns the card lists. More than this at once is rare. */
const SHOWN = 4;

/** A moment as "today, 17:00" or "31 Oct, 23:59", for a campaign's start or end. */
const moment = (iso: string, now: string) => (whenDay(iso, now) === "Today" ? whenInline(iso, now) : short(new Date(iso)));

/**
 * The deals running or starting within the day, soonest to change first, each
 * with when it ends or starts and how many of the sizes it sells are low or
 * sold out (the likeliest to run out, and the ones to restock first).
 */
export function DealsGlance({ deals, lowSkus, now }: { deals: LiveCampaign[]; lowSkus: string[]; now: string }) {
  const at = Date.parse(now);
  const rows = deals
    .map((c) => {
      const live = inWindow(c, at);
      return { c, live, next: Date.parse((live ? c.endsAt : c.startsAt) ?? "") || Infinity };
    })
    .sort((a, b) => Number(b.live) - Number(a.live) || a.next - b.next);

  return (
    <section className="widget" aria-labelledby="deals-title">
      <header className="widget__head">
        <h2 id="deals-title" className="widget__title">
          Deals
        </h2>
        {rows.length ? (
          <Hint label={`${plural(rows.length, "deal", "deals")} running or starting soon. See all campaigns`}>
            <Link href="/admin/campaigns" className="widget__total" aria-label={`${plural(rows.length, "deal", "deals")} running or starting soon, see all campaigns`}>
              {rows.length}
              <ArrowRight size={18} />
            </Link>
          </Hint>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <p className="hidden__clear">
          <Check size={20} />
          <span>
            No deal is running or about to start. <Link href="/admin/campaigns/new" className="admin-link">Make a campaign</Link>
          </span>
        </p>
      ) : (
        <ul className="hidden__list">
          {rows.slice(0, SHOWN).map(({ c, live, next }) => {
            const low = lowSkus.filter((s) => campaignsFor(s, [c]).length).length;
            const when = live ? (c.endsAt ? `${next - at < SOON_MS ? "Ends" : "Runs until"} ${moment(c.endsAt, now)}` : "Running, with no end date") : `Starts ${moment(c.startsAt!, now)}`;
            return (
              <GlanceRow
                key={c.id}
                href={`/admin/campaigns/${c.id}`}
                icon={low ? <Alert size={18} /> : <Tag size={18} />}
                title={c.name}
                text={`${when}.${low ? ` ${plural(low, "size it sells is", "sizes it sells are")} low or sold out.` : ""}`}
                calm={!low}
                open="Open campaign"
              />
            );
          })}
        </ul>
      )}
      {rows.length > SHOWN ? <p className="widget__note">And {rows.length - SHOWN} more under Campaigns.</p> : null}
    </section>
  );
}
