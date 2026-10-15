"use client";

import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { toLine } from "@/lib/catalog/cart";
import { itemCount, rands } from "@/lib/catalog/listing";
import {
  chartSizes,
  orderMessage,
  pickVariant,
  pricesDiffer,
  takesLine,
  variantLabel,
  type PurchaseItem,
} from "@/lib/catalog/purchase";
import { photosFor } from "@/lib/catalog/photos";
import type { ProductVariant } from "@/lib/catalog/types";
import { cart } from "@/app/site/cartStore";
import { whatsapp } from "@/app/site/data";
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
  const onePhoto = (photosFor(item, variant) ?? 1) === 1;

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

      {takes ? (
        <p className="buy__yours" aria-live="polite">
          <YourPhoto size={22} />
          <span>
            <strong>{takes}.</strong> You&rsquo;ll add{" "}
            {onePhoto && !item.personalisation?.text ? "it" : "them"} at checkout.
          </span>
        </p>
      ) : null}

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
            <legend className="opt__label">
              {option.name} <span>{chosen}</span>
            </legend>
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
          <button type="button" className="btn btn--soon" aria-disabled="true">
            <Cart size={19} />
            Add to cart
            <span className="btn__soon">ask for a price first</span>
          </button>
        )}
        <a className="btn btn--blue" href={whatsapp(orderMessage(item, variant, quantity))}>
          <WhatsApp size={19} />
          Order on WhatsApp
        </a>
      </div>

      <p className="buy__note">
        Online checkout opens soon. Until then, your cart or this order goes to
        the shop on WhatsApp, already written into the message
        {item.personalisation
          ? `, and you can send your ${onePhoto ? "photo" : "photos"} in the same chat.`
          : "."}
      </p>
    </div>
  );
}
