"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { toLine } from "@/lib/catalog/cart";
import { itemCount, rands } from "@/lib/catalog/listing";
import {
  chartSizes,
  pickVariant,
  pricesDiffer,
  takesLine,
  variantLabel,
  type PurchaseItem,
} from "@/lib/catalog/purchase";
import { photoSpec, type PhotoSpec } from "@/lib/catalog/photos";
import { cmLabel } from "@/lib/catalog/sizes";
import type { ProductVariant } from "@/lib/catalog/types";
import { cart } from "@/app/site/cartStore";
import { SHOP, whatsapp } from "@/app/site/data";
import { Cart, WhatsApp, YourPhoto } from "@/app/site/icons";
import { QuantityStepper } from "@/app/site/QuantityStepper";
import { SizeChart } from "../SizeChart";

type Props = {
  item: PurchaseItem;
  description: string;
  slug: string;
  /** The Cloudinary code of the first photograph, for the cart's thumbnail. */
  photo: string | null;
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

function PurchaseView({
  item,
  description,
  slug,
  photo,
  sku,
  onSelect,
}: Props & { sku: string | null; onSelect?: (v: ProductVariant) => void }) {
  const ids = useId();
  const [quantity, setQuantity] = useState(1);

  const variant = item.variants.find((v) => v.sku === sku) ?? item.variants[0];
  const chart = chartSizes(item);
  const which = variantLabel(item, variant);
  const price = variant.price;
  const takes = takesLine(item, variant);
  const spec = photoSpec(item, variant);

  const choose = (option: string, value: string) => {
    const next = pickVariant(item.variants, variant, option, value);
    if (next && next !== variant) onSelect?.(next);
  };

  return (
    <div className="buy">
      <p className="buy__price" aria-live="polite">
        {price !== null ? rands(price) : "Price on request"}
      </p>

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
                const price = showPrices
                  ? pickVariant(item.variants, variant, option.name, value)?.price
                  : undefined;
                return (
                  <label key={value} className="opt__pill">
                    <input
                      type="radio"
                      name={`${ids}-${option.name}`}
                      value={value}
                      checked={value === chosen}
                      onChange={() => choose(option.name, value)}
                    />
                    {value}
                    {price != null ? <span className="opt__price">{rands(price)}</span> : null}
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
        <QuantityStepper id={`${ids}-qty`} value={quantity} onChange={setQuantity} />
      </div>

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
        {price !== null ? (
          <button
            type="button"
            className="btn btn--gold on-gold"
            onClick={() => cart.add(toLine(item, variant, price, quantity, slug, photo))}
          >
            <Cart size={19} />
            Add to cart
          </button>
        ) : (
          <a
            className="btn btn--blue"
            href={whatsapp(`Hi! Could you tell me the price of the ${item.name}${which ? ` (${which})` : ""}? Product code: ${variant.sku}.`)}
          >
            <WhatsApp size={19} />
            Ask the shop for a price
          </a>
        )}
      </div>

      <p className="buy__note">
        Pay online, then collect it at the shop in {SHOP.town} or have it
        couriered to you. Need it by a date?{" "}
        <a
          className="inline-link"
          href={whatsapp(`Hi! I'm looking at the ${item.name}. Could it be ready by `)}
        >
          Ask the shop first
        </a>
        .
      </p>
    </div>
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
          {" "}{one ? "Your photo is" : "Each photo is"} printed whole unless you crop {it}, and checkout tells
          you if {one ? "it" : "one"} may print soft at this size.
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
