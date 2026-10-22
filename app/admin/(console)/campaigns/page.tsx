import type { Metadata } from "next";
import Link from "next/link";
import { PHASE_LABELS, RULE_HINTS, RULE_KINDS, RULE_NAMES, campaignSkus, endedBy, phaseOf, ruleSentence, type Campaign, type Phase } from "@/lib/catalog/campaigns";
import { rands } from "@/lib/catalog/listing";
import { campaignContext, handSpecials, listCampaigns } from "@/lib/admin/campaigns";
import { Alert, ArrowRight, Plus } from "@/app/site/icons";
import { AdoptSpecials } from "../../campaigns/AdoptSpecials";
import { contextNames } from "../../campaigns/names";
import { moment, stockAlert, summarise } from "../../campaigns/model";
import { Timeline } from "../../campaigns/Timeline";

export const metadata: Metadata = { title: "Campaigns" };

/** The groups, in the order a member of staff looks for them. */
const GROUPS: { phase: Phase; title: string }[] = [
  { phase: "live", title: "Live now" },
  { phase: "scheduled", title: "Scheduled" },
  { phase: "paused", title: "Paused" },
  { phase: "draft", title: "Drafts" },
  { phase: "ended", title: "Ended" },
];

/** How many ended campaigns show before the oldest are left off. */
const ENDED_SHOWN = 8;

/** When it runs, in a line. */
function dates(c: Campaign, phase: Phase, now: string): string {
  const from = c.startsAt ? moment(c.startsAt, now) : null;
  const to = c.endsAt ? moment(c.endsAt, now) : null;
  if (phase === "ended") {
    const by = endedBy(c, Date.parse(now));
    return by === "cap" ? "Reached its limit" : by === "hand" && c.endedAt ? `Ended early, ${moment(c.endedAt, now)}` : `Ended ${to}`;
  }
  if (from && to) return `${from} to ${to}`;
  if (to) return `Until ${to}`;
  if (from) return `From ${from}, until ended`;
  return phase === "draft" ? "No dates yet" : "Until ended";
}

/**
 * Every campaign: the coming weeks as a timeline against the gifting days,
 * then each one by where it is, with its deals in a line, when it runs, the
 * stock behind it while it's on, and what it has done from paid orders.
 */
export default async function CampaignsPage() {
  const [campaigns, ctx, hand] = await Promise.all([listCampaigns(), campaignContext(), handSpecials()]);
  const names = contextNames(ctx);
  const now = Date.parse(ctx.now);
  const withPhase = campaigns.map((c) => ({ c, phase: phaseOf(c, now) }));

  return (
    <div className="page camps">
      <header className="page__head">
        <div>
          <h1 className="page__title">Campaigns</h1>
          <p className="page__lede">
            Deals and specials, each with its dates and limits. While one is live, what it covers is on the shop’s Specials shelf with its deal, and
            the cart and checkout price it in. Deals that meet stack.
          </p>
        </div>
        <Link href="/admin/campaigns/new" className="camps__new">
          <Plus size={18} />
          New campaign
        </Link>
      </header>

      {hand.length ? <AdoptSpecials names={hand.map((p) => p.name)} /> : null}

      {campaigns.length === 0 ? (
        <section className="camps__first" aria-labelledby="first-title">
          <h2 id="first-title" className="empty__title">
            No campaigns yet
          </h2>
          <p className="empty__lede">
            A campaign is one or more deals that run for a while: from a day to a season. Start from the kind of deal you have in mind.
          </p>
          <ul className="camps__starts">
            {RULE_KINDS.map((k) => (
              <li key={k}>
                <Link href={`/admin/campaigns/new?kind=${k}`} className="camps__start">
                  <span className="camps__startName">{RULE_NAMES[k]}</span>
                  <span className="hint">{RULE_HINTS[k]}</span>
                  <ArrowRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <Timeline campaigns={campaigns} seasons={ctx.seasons} now={ctx.now} />

          {GROUPS.map(({ phase, title }) => {
            const all = withPhase.filter((x) => x.phase === phase);
            if (all.length === 0) return null;
            const rows = phase === "ended" ? all.slice(0, ENDED_SHOWN) : all;
            return (
              <section key={phase} className="camps__group" aria-labelledby={`g-${phase}`}>
                <h2 id={`g-${phase}`} className="group__title">
                  {title} <span className="camps__n">{all.length}</span>
                </h2>
                <ul className="camps__list">
                  {rows.map(({ c }) => {
                    const on = phase === "live" || phase === "scheduled" || phase === "paused";
                    const sides = campaignSkus(c.rules, ctx.catalogue);
                    const stock = summarise(new Set([...sides.buy, ...sides.get]), ctx.stock);
                    const warn = on && stock.out.length + stock.low.length > 0;
                    return (
                      <li key={c.id}>
                        <Link href={`/admin/campaigns/${c.id}`} className="camps__row">
                          <span className="camps__main">
                            <span className="camps__name">
                              {c.name || "Untitled campaign"}
                              {c.featured && on ? <span className="special">On the storefront</span> : null}
                            </span>
                            <span className="camps__deals">{c.rules.length ? c.rules.map((r) => ruleSentence(r, ctx.catalogue, names)).join(" · ") : "No deal yet"}</span>
                          </span>
                          <span className="camps__when">
                            <span className={`cphase cphase--${phase}`}>{PHASE_LABELS[phase]}</span>
                            <span>{dates(c, phase, ctx.now)}</span>
                          </span>
                          <span className="camps__facts">
                            {warn ? (
                              <span className="camps__stock">
                                <Alert size={18} />
                                {stockAlert(stock)}
                              </span>
                            ) : null}
                            {c.used.orders ? (
                              <span className="camps__used mono">
                                {c.used.orders} {c.used.orders === 1 ? "order" : "orders"} · {rands(c.used.discount)} off
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {all.length > rows.length ? <p className="hint">And {all.length - rows.length} older.</p> : null}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
