"use client";

import Link from "next/link";
import {
  PHASE_LABELS,
  cartSavings,
  phaseOf,
  priceDeals,
  campaignSkus,
  resolveCampaign,
  stackOrder,
  stageOne,
  type Campaign,
  type CampaignDraft,
  type DealLine,
  type LiveCampaign,
} from "@/lib/catalog/campaigns";
import { dealOn, rands, signedRands, type Listing } from "@/lib/catalog/listing";
import type { CampaignContext, CatalogueItem } from "@/lib/admin/campaigns";
import { MIN_PAYMENT } from "@/lib/checkout/order";
import { ProductCard } from "@/app/shop/ProductCard";
import { Alert, Check, Tag } from "@/app/site/icons";
import { contextNames } from "./names";
import { overlaps, skuIndex, soldOutOf, stockOf, summarise } from "./model";
import { SizeStock } from "./TargetPicker";

/** How many sizes the stack and stock lists show before saying how many more. */
const SHOWN = 6;

/** A card as the shop would draw it under these campaigns, from the deal the shop's own cards read (`dealOn`). */
function sampleListing(p: CatalogueItem, deals: LiveCampaign[], soldOut: Record<string, number>): Listing {
  const d = dealOn(p, soldOut, deals);
  return {
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    category: "",
    personalisable: false,
    tags: [],
    special: d.special,
    min: d.range?.min ?? null,
    max: d.range?.max ?? null,
    was: d.was,
    deals: d.labels,
    photo: p.photo,
    hint: null,
    rank: 0,
    soldOut: d.range === null,
  };
}

/**
 * Beside the editor, what the campaign does as it stands: a product card as
 * shoppers will see it, a cart that shows a deal at work, what it stacks with
 * and the price that comes to, and the stock behind it. Worked out by the
 * shop's own engine, so what is here is what the shop will do.
 */
export function Insights({ id, draft, sides, ctx, others }: { id: string; draft: CampaignDraft; sides: { buy: Set<string>; get: Set<string> }; ctx: CampaignContext; others: Campaign[] }) {
  const names = contextNames(ctx);
  const index = skuIndex(ctx.catalogue);
  const now = Date.parse(ctx.now);
  const soldOut = soldOutOf(ctx.stock);

  const self = resolveCampaign({ ...draft, id, name: draft.name || "This campaign" }, ctx.catalogue, names, soldOut);
  const mine = new Set([...sides.buy, ...sides.get]);

  // Campaigns that could run alongside this one and touch the same sizes.
  const overlapping = others.filter((o) => {
    const p = phaseOf(o, now);
    if (p === "draft" || p === "ended" || !overlaps(o, draft)) return false;
    const theirs = campaignSkus(o.rules, ctx.catalogue);
    return [...theirs.buy, ...theirs.get].some((s) => mine.has(s));
  });
  const stacked = stackOrder([self, ...overlapping.map((o) => resolveCampaign(o, ctx.catalogue, names, soldOut))]);

  // The card: the first product the deal reaches, on the side it is reduced.
  const sampleSku = [...sides.get, ...sides.buy].find((s) => index.has(s));
  const sample = sampleSku ? index.get(sampleSku)!.product : null;

  // A cart that shows the item deal at work.
  const cart = ((): DealLine[] => {
    const unit = (sku: string, quantity: number): DealLine[] => {
      const v = index.get(sku)?.product.variants.find((x) => x.sku === sku);
      return v?.price != null ? [{ sku, quantity, price: v.price }] : [];
    };
    for (const r of self.rules) {
      if (r.kind === "bxgy" && r.skus[0]) return unit(r.skus[0], r.buy + r.get);
      if (r.kind === "pair" && r.buySkus[0] && r.getSkus[0]) return [...unit(r.buySkus[0], 1), ...unit(r.getSkus[0], r.per)];
    }
    return [];
  })();
  const cartPriced = cart.length ? priceDeals(cart, [self]) : null;
  const spend = self.rules.find((r) => r.kind === "spend");

  // Stacked prices: every size a price deal from more than one campaign reaches.
  const clashes = (() => {
    if (overlapping.length === 0) return [];
    return [...mine]
      .flatMap((sku) => {
        const info = index.get(sku);
        const base = info?.product.variants.find((v) => v.sku === sku)?.price;
        if (!info || base == null) return [];
        const alone = stageOne(sku, base, [self]).price;
        const all = stageOne(sku, base, stacked);
        const from = new Set(all.steps.map((s) => s.campaign.id));
        return from.size > 1 ? [{ sku, what: info.what, base, alone, price: all.price }] : [];
      })
      .sort((a, b) => a.price - b.price);
  })();
  const free = clashes.filter((c) => c.price === 0);
  const underFloor = clashes.filter((c) => c.price > 0 && c.price < MIN_PAYMENT);

  const buyStock = summarise(sides.buy, ctx.stock);
  const getStock = summarise([...sides.get].filter((s) => !sides.buy.has(s)), ctx.stock);
  const flagged = [...new Set([...buyStock.out, ...getStock.out, ...buyStock.low, ...getStock.low])];
  const cap = draft.caps.units;
  const sellable = summarise(mine, ctx.stock).sellable;

  return (
    <aside className="preview insights" aria-label="What this campaign does">
      <section className="insights__part" aria-labelledby="ins-shop">
        <h2 id="ins-shop" className="preview__title">
          What shoppers see
        </h2>
        {sample ? (
          <div className="preview__card" inert>
            <ProductCard listing={sampleListing(sample, [self], soldOut)} yours={false} sizes="290px" />
          </div>
        ) : (
          <p className="hint">Choose what the deal covers, and its card shows here.</p>
        )}
        {cartPriced ? (
          <div className="insights__cart" aria-label="In the cart">
            <p className="insights__label">In the cart</p>
            <ul>
              {cartPriced.lines.map((l) => (
                <li key={l.sku}>
                  <span>
                    {l.quantity} × {index.get(l.sku)?.what}
                  </span>
                  <span className="mono">{rands(l.price * l.quantity)}</span>
                </li>
              ))}
              {cartSavings(cartPriced).map((s) => (
                <li key={s.rule} className="insights__saving">
                  <span>
                    <Tag size={16} /> {s.label}
                  </span>
                  <span className="mono">{signedRands(-s.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {spend && spend.kind === "spend" ? (
          <p className="hint">
            The cart shows “{spend.label || `Spend ${rands(spend.min)}`}” once it reaches {rands(spend.min)}, and nudges shoppers who are close.
          </p>
        ) : null}
      </section>

      <section className="insights__part" aria-labelledby="ins-stack">
        <h2 id="ins-stack" className="preview__title">
          Stacks with
        </h2>
        {overlapping.length === 0 ? (
          <p className="insights__clear">
            <Check size={18} />
            No other campaign reaches these products at the same time.
          </p>
        ) : (
          <>
            <ul className="insights__list">
              {overlapping.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/campaigns/${o.id}`} className="admin-link" target="_blank">
                    {o.name}
                  </Link>
                  <span className="insights__phase">{PHASE_LABELS[phaseOf(o, now)]}</span>
                </li>
              ))}
            </ul>
            <p className="hint">Everything stacks: price deals first, then item deals, then spend thresholds on what’s left.</p>
            {clashes.length ? (
              <table className="insights__table">
                <caption className="visually-hidden">Prices with every campaign stacked</caption>
                <thead>
                  <tr>
                    <th scope="col">Size</th>
                    <th scope="col">Alone</th>
                    <th scope="col">Stacked</th>
                  </tr>
                </thead>
                <tbody>
                  {clashes.slice(0, SHOWN).map((c) => (
                    <tr key={c.sku} data-bad={c.price < MIN_PAYMENT || undefined}>
                      <th scope="row">{c.what}</th>
                      <td className="mono">{rands(c.alone)}</td>
                      <td className="mono">{rands(c.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {clashes.length > SHOWN ? <p className="hint">And {clashes.length - SHOWN} more sizes.</p> : null}
            {free.length || underFloor.length ? (
              <p className="insights__warn" role="note">
                <Alert size={18} />
                <span>
                  {free.length ? `Stacked, ${free.length === 1 ? "1 size sells" : `${free.length} sizes sell`} for R0. ` : ""}
                  {underFloor.length ? `${underFloor.length === 1 ? "1 size comes" : `${underFloor.length} sizes come`} to under ${rands(MIN_PAYMENT)}, and online orders start at ${rands(MIN_PAYMENT)}. ` : ""}
                  Check that’s meant.
                </span>
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="insights__part" aria-labelledby="ins-stock">
        <h2 id="ins-stock" className="preview__title">
          Stock
        </h2>
        {mine.size === 0 ? (
          <p className="hint">Shown once the deal covers something.</p>
        ) : flagged.length === 0 ? (
          <p className="insights__clear">
            <Check size={18} />
            Nothing it covers is sold out or low.
          </p>
        ) : (
          <>
            <ul className="insights__list insights__list--stock">
              {flagged.slice(0, SHOWN).map((sku) => (
                <li key={sku}>
                  <Link href={`/admin/stock?q=${encodeURIComponent(sku)}`} className="admin-link" target="_blank">
                    {index.get(sku)?.what ?? sku}
                  </Link>
                  <span className="insights__side">{sides.get.has(sku) && !sides.buy.has(sku) ? "Given" : "Bought"}</span>
                  <SizeStock state={stockOf(ctx.stock, sku)} inline />
                </li>
              ))}
            </ul>
            {flagged.length > SHOWN ? <p className="hint">And {flagged.length - SHOWN} more.</p> : null}
            {getStock.out.length ? <p className="hint">A sold-out size on the given side is never offered, so the deal can’t promise it.</p> : null}
            <Link href="/admin/stock?show=low" className="admin-link" target="_blank">
              Receive stock
            </Link>
          </>
        )}
        {cap !== null && sellable !== null && cap > sellable ? (
          <p className="insights__warn" role="note">
            <Alert size={18} />
            <span>
              Capped at {cap} units, and {sellable} {sellable === 1 ? "is" : "are"} in stock to sell.
            </span>
          </p>
        ) : null}
      </section>
    </aside>
  );
}
