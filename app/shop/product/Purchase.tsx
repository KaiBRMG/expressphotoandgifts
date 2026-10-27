"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import type { ProductDeal } from "@/lib/catalog/campaigns";
import { toLine } from "@/lib/catalog/cart";
import { itemCount, rands } from "@/lib/catalog/listing";
import {
  chartSizes,
  orderWhat,
  pickVariant,
  pricesDiffer,
  takesLine,
  variantLabel,
  type PurchaseItem,
} from "@/lib/catalog/purchase";
import { photoSpec, type PhotoSpec } from "@/lib/catalog/photos";
import { cmLabel } from "@/lib/catalog/sizes";
import { maxFor, type Availability } from "@/lib/catalog/stock";
import type { ProductVariant } from "@/lib/catalog/types";
import { cart, useCart } from "@/app/site/cartStore";
import { useWhatsApp } from "@/app/site/ContactContext";
import { DELIVERY_TIME, HOURS, SHOP } from "@/app/site/data";
import { Cart, Clock, Parcel, Pin, Tag, Truck, WhatsApp, YourPhoto } from "@/app/site/icons";
import { QuantityStepper } from "@/app/site/QuantityStepper";
import { StockLimit } from "@/app/site/StockLimit";
import { track } from "@/app/site/track";
import { SizeChart } from "../SizeChart";

type Props = {
  item: PurchaseItem;
  description: string;
  slug: string;
  /** The Cloudinary code of the first photograph, for the cart's thumbnail. */
  photo: string | null;
  /** Its sold-out variants, each at 0, as the page was built; the browser asks for the counts behind a limit. */
  soldOut: Availability;
  /** The live campaigns' prices and words for it, as the page was built. The cart keeps the catalogue price and applies them itself. */
  deal: ProductDeal;
};

/**
 * The buy column, with the chosen variant read from `?variant=<SKU>`, so a
 * shared link or a refresh opens on the same size or colour. Choosing writes
 * the URL in place with the History API: the page already holds every
 * variant, so there is nothing to fetch.
 */
export function Purchase(props: Props) {
  const params = useSearchParams();
  const [sku, setSku] = useState(() => params.get("variant"));
  useEffect(() => {
    track({ step: "view", slug: props.slug });
  }, [props.slug]);

  const select = (next: ProductVariant) => {
    setSku(next.sku);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next.sku);
    window.history.replaceState(null, "", url);
  };

  return <PurchaseView {...props} sku={sku} onSelect={select} />;
}

/**
 * The same column before the URL has been read: the first variant, every
 * control at rest. It is what a static render and a browser without scripts
 * see, so the price is on the page before it wakes.
 */
export function PurchaseFallback(props: Props) {
  return <PurchaseView {...props} sku={null} />;
}

/**
 * The variant a page opens on: the cheapest priced one that isn't sold out,
 * so the price on arrival is the "from" price the card quoted, not a dearer
 * size the visitor did not pick. The first in the shop's order breaks a tie
 * and stands in when nothing is priced or everything is sold out.
 */
function opening(variants: ProductVariant[], soldOut: Availability): ProductVariant {
  const buyable = variants.filter((v) => maxFor(soldOut, v.sku) !== 0);
  return (buyable.length ? buyable : variants).reduce((best, v) =>
    v.price !== null && (best.price === null || v.price < best.price) ? v : best,
  );
}

function PurchaseView({
  item,
  description,
  slug,
  photo,
  soldOut: built,
  deal,
  sku,
  onSelect,
}: Props & { sku: string | null; onSelect?: (v: ProductVariant) => void }) {
  const wa = useWhatsApp();
  const ids = useId();
  const [quantity, setQuantity] = useState(1);
  const { lines, available: counts } = useCart();
  // The counts, once fetched, are newer than the page.
  const available = useMemo(() => ({ ...built, ...counts }), [built, counts]);
  useEffect(() => {
    cart.checkStock(false, true);
  }, []);

  const variant = item.variants.find((v) => v.sku === sku) ?? opening(item.variants, built);
  const chart = chartSizes(item);
  const which = variantLabel(item, variant);
  // What it costs with the price deals; the catalogue's price is what goes in the cart, which applies them itself.
  const base = variant.price;
  const price = base === null ? null : (deal.now[variant.sku] ?? base);
  const takes = takesLine(item, variant);
  const spec = photoSpec(item, variant);
  // Stock: none of this size left, or fewer than asked for once what's in the cart is counted.
  const max = maxFor(available, variant.sku);
  const soldOut = max === 0;
  const inCart = lines.find((l) => l.sku === variant.sku)?.quantity ?? 0;
  const room = max === null ? null : Math.max(0, max - inCart);
  const short = room !== null && !soldOut && quantity > room;
  const what = orderWhat(item.name, which);

  const choose = (option: string, value: string) => {
    const next = pickVariant(item.variants, variant, option, value);
    if (next && next !== variant) onSelect?.(next);
  };

  return (
    <div className="buy">
      <p className="buy__price" aria-live="polite">
        {price !== null ? rands(price) : "Price on request"}
        {!soldOut && base !== null && price !== null && price < base ? (
          <s className="buy__was">
            <span className="visually-hidden">, was </span>
            {rands(base)}
          </s>
        ) : null}
        {soldOut ? <span className="buy__soldout">Sold out</span> : null}
      </p>

      {deal.labels.length > 0 && !soldOut ? (
        <ul className="buy__deals" aria-label="On special">
          {deal.labels.map((l) => (
            <li key={l}>
              <Tag size={18} />
              {l}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="buy__desc">{description}</p>

      {takes && spec ? <PhotoNeeds takes={takes} spec={spec} words={Boolean(item.personalisation?.text)} /> : null}

      {item.options.map((option) => {
        const chosen = variant.optionValues[option.name];
        const showPrices = pricesDiffer(item.variants, option.name);

        if (chart && option.name === "Size") {
          return (
            <div key={option.name} className="opt">
              <p className="opt__label" aria-hidden="true">
                {option.name} <span>{chosen}</span>
              </p>
              <SizeChart
                sizes={chart}
                tone="paper"
                legend={option.name}
                picked={Math.max(0, chart.findIndex((s) => s.label === chosen))}
                onPick={(i) => choose(option.name, chart[i].label)}
              />
            </div>
          );
        }

        return (
          <fieldset key={option.name} className="opt">
            <legend className="opt__label">{option.name}</legend>
            <div className="opt__values">
              {option.values.map((value) => {
                const lands = pickVariant(item.variants, variant, option.name, value);
                const price = showPrices && lands?.price != null ? (deal.now[lands.sku] ?? lands.price) : undefined;
                const out = lands !== null && maxFor(available, lands.sku) === 0;
                return (
                  <label key={value} className="opt__pill" data-soldout={out || undefined}>
                    <input
                      type="radio"
                      name={`${ids}-${option.name}`}
                      value={value}
                      checked={value === chosen}
                      onChange={() => choose(option.name, value)}
                    />
                    {value}
                    {out ? <span className="opt__price">Sold out</span> : price != null ? <span className="opt__price">{rands(price)}</span> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="buy__qty">
        <label className="opt__label" htmlFor={`${ids}-qty`}>
          Quantity
        </label>
        <QuantityStepper id={`${ids}-qty`} value={quantity} onChange={setQuantity} max={room || undefined} />
      </div>

      {short ? (
        <StockLimit
          room={room}
          max={max!}
          wanted={quantity + inCart}
          what={what}
          sku={variant.sku}
          takeLabel={`Add ${room} to cart`}
          onTake={() => {
            cart.add(toLine(item, variant, base!, room, slug, photo));
            setQuantity(1);
          }}
        />
      ) : null}

      {/* The counter slip: the order as the shop will read it. */}
      <div className="slip" aria-live="polite">
        <p className="slip__line">
          {[which, itemCount(quantity)].filter(Boolean).join(" · ")}
        </p>
        <p className="slip__total">
          <span>Total</span>
          <strong>{price !== null ? rands(price * quantity) : "Ask the shop for a price"}</strong>
        </p>
      </div>

      <div className="buy__actions">
        {soldOut ? (
          <a
            className="btn btn--blue"
            href={wa(`Hi! The ${what} (code ${variant.sku}) is sold out on the site. When will you have more?`)}
            target="_blank"
            rel="noopener"
          >
            <WhatsApp size={19} />
            Sold out: ask when it&rsquo;s back
          </a>
        ) : short ? null : price !== null ? (
          <button
            type="button"
            className="btn btn--gold on-gold"
            onClick={() => cart.add(toLine(item, variant, base!, quantity, slug, photo))}
          >
            <Cart size={19} />
            Add to cart
          </button>
        ) : (
          <a
            className="btn btn--blue"
            href={wa(`Hi! Could you tell me the price of the ${item.name}${which ? ` (${which})` : ""}? Product code: ${variant.sku}.`)}
          >
            <WhatsApp size={19} />
            Ask the shop for a price
          </a>
        )}
      </div>

      <Getting name={item.name} personal={item.personalisation !== null} />
    </div>
  );
}

/**
 * How the order reaches the customer, under the button that commits to it:
 * the two real routes, collect or courier, with the shop's own address and
 * hours, the standard delivery time, and a way to ask about a date before
 * ordering. Every fact here is from `data.ts`. Last, what can come back: the law asks for a
 * personalised product's lack of a change-of-mind return to be said before
 * the customer buys, not found later in the policy.
 */
function Getting({ name, personal }: { name: string; personal: boolean }) {
  const wa = useWhatsApp();
  const open = HOURS.filter((h) => !h.closed).map((h) => `${h.days} ${h.time}`).join(", ");
  return (
    <ul className="getting" aria-label="Collect or courier">
      <li>
        <Pin size={20} />
        <p>
          <strong>Collect at the shop</strong>
          <span>
            {SHOP.street}, {SHOP.town}. Open {open}.
          </span>
        </p>
      </li>
      <li>
        <Truck size={20} />
        <p>
          <strong>Or have it couriered</strong>
          <span>The Courier Guy brings it to your door, or straight to the person it&rsquo;s for. Priced at checkout.</span>
        </p>
      </li>
      <li>
        <Clock size={20} />
        <p>
          <strong>Need it by a date?</strong>
          <span>Delivery takes {DELIVERY_TIME}. Check with the shop for anything sooner.</span>
        </p>
        <a
          className="getting__ask"
          href={wa(`Hi! I'm looking at the ${name}. Could it be ready by `)}
        >
          <WhatsApp size={17} />
          Ask about a date
        </a>
      </li>
      <li>
        <Parcel size={20} />
        <p>
          <strong>{personal ? "Made for you" : "Changed your mind?"}</strong>
          <span>
            {personal
              ? "Because it\u2019s made with your photos or words, it can\u2019t be returned for a change of mind. If it arrives faulty or not as you ordered, we put it right. "
              : "Return it within 7 days of delivery, unused. If it arrives faulty, we put it right. "}
            <Link className="inline-link" href="/terms#returns">
              Returns policy
            </Link>
          </span>
        </p>
      </li>
    </ul>
  );
}

/**
 * What the product needs from the customer's photos, before they commit: how
 * many, the size each is printed at, drawn to its own proportions and shape,
 * and what happens to them at checkout. Everything here is read from the
 * product's "photos:", "print:" and "shape:" tags, the same ones the photo
 * step uses, so the page cannot promise a print the checkout does not make.
 */
function PhotoNeeds({ takes, spec, words }: { takes: string; spec: PhotoSpec; words: boolean }) {
  const one = spec.photos === 1;
  const it = one ? "it" : "them";
  return (
    <div className="needs" aria-live="polite">
      {spec.print ? <PrintOutline print={spec.print} shape={spec.shape} /> : <YourPhoto size={26} />}
      <div className="needs__copy">
        <p className="needs__takes">
          <strong>{takes}.</strong>
          {spec.print ? (
            <span className="needs__area">
              {one ? "Printed at" : "Each printed at"} {cmLabel(spec.print)}
              {spec.shape === "round" ? ", as a circle" : spec.shape === "dome" ? ", in an arched window" : ""}
            </span>
          ) : null}
        </p>
        <p className="needs__how">
          You add {it} at checkout{words ? ", with your words," : ""} and see {it} in place before you pay.
          {" "}{one ? "Your photo is" : "Each photo is"} printed whole unless you crop {it}.
        </p>
      </div>
    </div>
  );
}

/** The print area as a small outline in its own proportions: a rectangle, a circle or an arch. */
function PrintOutline({ print, shape }: { print: { w: number; h: number }; shape: PhotoSpec["shape"] }) {
  const box = 44;
  const k = box / Math.max(print.w, print.h);
  const w = print.w * k;
  const h = print.h * k;
  const x = (box - w) / 2 + 2;
  const y = (box - h) / 2 + 2;
  const r = Math.min(w / 2, h);
  return (
    <svg className="needs__outline" width={box + 4} height={box + 4} viewBox={`0 0 ${box + 4} ${box + 4}`} aria-hidden="true">
      {shape === "round" ? (
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} />
      ) : shape === "dome" ? (
        <path d={`M${x} ${y + h}V${y + r}a${w / 2} ${r} 0 0 1 ${w} 0V${y + h}Z`} />
      ) : (
        <rect x={x} y={y} width={w} height={h} rx={2} />
      )}
    </svg>
  );
}
