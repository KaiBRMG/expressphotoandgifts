"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cartSavings, type DealPriced } from "@/lib/catalog/campaigns";
import { cartUnits, liveLines, overStock, unitsLabel, type CartLine } from "@/lib/catalog/cart";
import { orderWhat } from "@/lib/catalog/purchase";
import { maxFor, type Availability } from "@/lib/catalog/stock";
import { framePrint, type FrameNeeds, type Needs } from "@/lib/catalog/checkout";
import { cmLabel } from "@/lib/catalog/sizes";
import { itemCount, productHref, rands, signedRands } from "@/lib/catalog/listing";
import { cart, useCart, useDealPrice, usePricedCart } from "./cartStore";
import { ArrowRight, Cart as CartIcon, Close, Plus, Tag, Upload, YourPhoto } from "./icons";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";
import { StockLimit } from "./StockLimit";
import { useWhatsApp } from "./ContactContext";

/**
 * The dock's pill. With something in the cart it is the cart, with the count
 * of units on it, and opens the drawer; otherwise it is Shop now, or nothing
 * inside the shop, where Shop now would point at the page it is on. It stays
 * while the drawer is open even if the last line is removed, so the drawer's
 * focus has somewhere to return to; it leaves when the drawer closes.
 */
export function DockAction({ shopAction }: { shopAction: boolean }) {
  const { lines, open, prices, available } = useCart();
  const units = cartUnits(liveLines(lines, prices, available));

  if (units > 0 || open) {
    return (
      <button
        type="button"
        className="btn btn--gold on-gold dock__cta dock__cart"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="cart-drawer"
        onClick={cart.open}
      >
        <CartIcon size={19} />
        Cart
        {units > 0 ? (
          <span key={units} className="dock__count" aria-hidden="true">
            {unitsLabel(units)}
          </span>
        ) : null}
        <span className="visually-hidden">, {itemCount(units)}</span>
      </button>
    );
  }

  return shopAction ? (
    <Link className="btn btn--gold on-gold dock__cta" href="/shop">
      Shop now
      <ArrowRight size={17} />
    </Link>
  ) : null;
}

/**
 * The header's cart mark. It opens the same drawer as the dock's pill, at every
 * count, so an empty cart says so rather than the mark going nowhere; with
 * something in it the mark carries the count of units on a gold disc.
 */
export function HeaderCart() {
  const { lines, open, prices, available } = useCart();
  const units = cartUnits(liveLines(lines, prices, available));

  return (
    <button
      type="button"
      className="header__icon header__cart"
      data-narrow="keep"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="cart-drawer"
      aria-label={`Cart, ${itemCount(units)}`}
      onClick={cart.open}
    >
      <span className="header__glyph">
        <CartIcon size={21} />
        {units > 0 ? (
          <span key={units} className="header__count" aria-hidden="true">
            {unitsLabel(units)}
          </span>
        ) : null}
      </span>
      <span className="header__label">Cart</span>
    </button>
  );
}

let needsLoad:Promise<Needs | null> | null = null;

/** What each variant needs at checkout, fetched once a visit from the static `/api/needs`. */
function useNeeds(open: boolean): Needs | null {
  const [needs, setNeeds] = useState<Needs | null>(null);
  useEffect(() => {
    if (!open) return;
    needsLoad ??= fetch("/api/needs")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    let live = true;
    needsLoad.then((n) => live && setNeeds(n));
    return () => {
      live = false;
    };
  }, [open]);
  return needs;
}

/**
 * The cart, as a drawer from the right edge (the full width on a phone). A
 * native modal dialog: it holds focus, closes on Escape, keeps the page behind
 * it inert and hands focus back to whatever opened it. Each time it opens it
 * re-checks every price against the catalogue, so the total it shows is the
 * one the shop will charge.
 *
 * The way out is checkout: the photo step when anything takes a photo,
 * otherwise straight to the customer's details.
 */
export function CartDrawer() {
  const { lines, open, was, available, removed } = useCart();
  const { live, priced, unit } = usePricedCart();
  const ref = useRef<HTMLDialogElement>(null);
  const needs = useNeeds(open);
  const wa = useWhatsApp();
  const skus = new Set(lines.map((l) => l.sku));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) cart.checkPrices();
  }, [open]);

  const hasLines = lines.length > 0;
  const units = cartUnits(live);
  const photos = live.some((l) => l.takes);
  // A line asking for more than there is waits on the customer's choice before checkout.
  const waiting = live.filter((l) => overStock(l, available) !== null);
  const dateAsk = wa(`Hi! I'd like to order ${live.slice(0, 3).map((l) => orderWhat(l.name, l.variant)).join(", ")}${live.length > 3 ? " and more" : ""}. Could it be ready by `);

  return (
    <dialog
      ref={ref}
      id="cart-drawer"
      className="cart"
      aria-labelledby="cart-title"
      onClose={cart.close}
      // The dialog box is filled by its panel, so a click that lands on the
      // dialog itself landed on the backdrop.
      onClick={(e) => e.target === e.currentTarget && cart.close()}
    >
      <div className="cart__panel">
        <header className="cart__head">
          <h2 id="cart-title" className="cart__title">
            Your cart
            {units > 0 ? <span className="cart__units">{itemCount(units)}</span> : null}
          </h2>

          <button type="button" className="cart__close" aria-label="Close cart" onClick={cart.close}>
            <Close size={22} />
          </button>
        </header>

        {hasLines ? (
          <>
            {/* What scrolls: the lines, the savings and the reassurance. The foot under it keeps only what must stay on screen. */}
            <div className="cart__body">
              <ul className="cart__lines">
                {removed ? (
                  <li className="cart__undo-row">
                    <UndoNote removed={removed} />
                  </li>
                ) : null}
                {lines.map((line) => (
                  <Line
                    key={line.sku}
                    line={line}
                    unavailable={!live.includes(line)}
                    available={available}
                    was={was[line.sku]}
                    now={unit(line)}
                    frame={needs?.[line.sku]?.frame}
                    inCart={skus}
                  />
                ))}
              </ul>
              {live.length > 0 ? (
                <>
                  <Deals priced={priced} onGo={cart.close} />
                  <p className="cart__note cart__assure">
                    You review the whole order before you pay, and payment is secure, through PayFast. Need it by a date?{" "}
                    <a className="inline-link" href={dateAsk} target="_blank" rel="noopener">
                      Ask the shop
                    </a>
                    .
                  </p>
                </>
              ) : null}
            </div>

            <footer className="cart__foot">
              {live.length > 0 ? (
                <>
                  <p className="slip__total" aria-live="polite">
                    <span>
                      Subtotal <span className="cart__excl">before delivery</span>
                    </span>
                    <strong>{rands(priced.total)}</strong>
                  </p>
                  {waiting.length > 0 ? (
                    <p className="cart__note cart__wait" role="status">
                      {waiting.length === 1 ? "Choose what to do about the item marked above" : `Choose what to do about the ${waiting.length} items marked above`},
                      then check out.
                    </p>
                  ) : photos ? (
                    <>
                      <Link className="btn btn--gold on-gold cart__order" href="/checkout" onClick={cart.close}>
                        <Upload size={19} />
                        Add your photos
                      </Link>
                      <p className="cart__note">
                        Place each photo on what it goes on, in the shape it&rsquo;ll print. Then your
                        details, collection or delivery, and payment.
                      </p>
                    </>
                  ) : (
                    <>
                      <Link className="btn btn--gold on-gold cart__order" href="/checkout/details" onClick={cart.close}>
                        Checkout
                        <ArrowRight size={19} />
                      </Link>
                      <p className="cart__note">Collect from the shop in Scottburgh, or have it couriered to you.</p>
                    </>
                  )}
                </>
              ) : null}
              <button type="button" className="inline-link cart__keep" onClick={cart.close}>
                Keep shopping
              </button>
            </footer>
          </>
        ) : (
          <div className="cart__empty">
            {removed ? <UndoNote removed={removed} /> : null}
            <p>Your cart is empty.</p>
            <Link className="btn btn--gold on-gold" href="/shop" onClick={cart.close}>
              Browse the shop
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </div>
    </dialog>
  );
}

/**
 * The line just taken out, and the way to put it back. Focus moves to Undo
 * when it appears, because the Remove that was pressed has just left the page
 * and a keyboard or screen-reader user would otherwise be dropped at the top.
 */
function UndoNote({ removed }: { removed: NonNullable<ReturnType<typeof useCart>["removed"]> }) {
  const undo = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    undo.current?.focus();
  }, [removed]);
  const { name, variant } = removed.line;
  return (
    <p className="cart__undo">
      <span>
        Removed {name}
        {variant ? `, ${variant}` : ""}.
      </span>
      <button ref={undo} type="button" className="inline-link cart__undo-btn" onClick={cart.undo}>
        Undo
      </button>
    </p>
  );
}

/**
 * What the campaigns do to the cart beyond its prices: each saving the item
 * deals and spend thresholds make, and what adding something more would
 * bring. Nothing at all when no deal reaches the cart.
 */
function Deals({ priced, onGo }: { priced: DealPriced; onGo: () => void }) {
  const savings = cartSavings(priced);
  if (savings.length === 0 && priced.nudges.length === 0) return null;
  return (
    <div className="deals">
      {savings.length > 0 ? (
        <ul className="deals__saved" aria-label="Your savings">
          {savings.map((s) => (
            <li key={`${s.campaign}/${s.rule}`}>
              <span>
                <Tag size={18} />
                {s.label}
              </span>
              <span className="deals__off">{signedRands(-s.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {priced.nudges.map((n) => (
        <p key={`${n.campaign}/${n.rule}`} className="deals__nudge">
          <strong>{n.label}</strong> {n.text}{" "}
          {n.href ? (
            <Link className="inline-link" href={n.href} onClick={onGo}>
              Find it
            </Link>
          ) : null}
        </p>
      ))}
    </div>
  );
}

function Line({
  line,
  unavailable,
  available,
  was,
  now,
  frame,
  inCart,
}: {
  line: CartLine;
  unavailable: boolean;
  available: Availability | null;
  was?: number;
  /** Each unit's price after the price deals; absent when the line isn't priced (unavailable). */
  now?: number;
  /** For a frame: the size it holds and the print that fills it. */
  frame?: FrameNeeds;
  inCart: ReadonlySet<string>;
}) {
  const wa = useWhatsApp();
  const { sku, slug, name, variant, price, quantity, photo, takes } = line;
  const href = productHref(slug);
  const label = variant ? `${name}, ${variant}` : name;
  const max = maxFor(available, sku);
  const soldOut = max === 0;
  const over = overStock(line, available);
  const what = orderWhat(name, variant);

  return (
    <li className="cart__line" data-unavailable={unavailable || undefined}>
      <Link className="cart__thumb" href={href} tabIndex={-1} aria-hidden="true" onClick={cart.close}>
        {photo ? <ProductImage code={photo} alt="" fill sizes="80px" /> : null}
      </Link>

      <div className="cart__info">
        <p className="cart__name">
          <Link href={href} onClick={cart.close}>
            {name}
          </Link>
        </p>
        {variant ? <p className="cart__variant">{variant}</p> : null}
        {takes && !unavailable ? (
          <p className="cart__takes">
            <YourPhoto size={18} />
            {takes}
          </p>
        ) : null}
        {frame && !unavailable ? <FrameNote frame={frame} quantity={line.quantity} inCart={inCart} /> : null}
        {soldOut ? (
          <p className="cart__flag">
            Sold out, so it&rsquo;s left out of your order.{" "}
            <a className="inline-link" href={wa(`Hi! The ${what} (code ${sku}) is sold out on the site. When will you have more?`)} target="_blank" rel="noopener">
              Ask when it&rsquo;s back
            </a>
          </p>
        ) : unavailable ? (
          <p className="cart__flag">No longer available, so it&rsquo;s left out of your order.</p>
        ) : was !== undefined ? (
          <p className="cart__flag">
            Price changed from {rands(was)} to {rands(price)} each.
          </p>
        ) : null}

        {over !== null ? (
          <StockLimit
            room={over}
            max={over}
            wanted={quantity}
            what={what}
            sku={sku}
            takeLabel={`Order ${over}`}
            onTake={() => cart.setQuantity(sku, over)}
          />
        ) : null}

        <div className="cart__row">
          {unavailable ? null : (
            <QuantityStepper value={quantity} onChange={(n) => cart.setQuantity(sku, n)} label={label} max={max ?? undefined} />
          )}
          {unavailable ? null : (
            <p className="cart__price">
              {now !== undefined && now < price ? (
                <>
                  <s className="cart__was">
                    <span className="visually-hidden">Was </span>
                    {rands(price * quantity)}
                  </s>{" "}
                  <span className="visually-hidden">now </span>
                </>
              ) : null}
              {rands((now ?? price) * quantity)}
            </p>
          )}
          {/* After the price, and so after the stepper, with the room the row gives it: a thumb on + is never a thumb on Remove. */}
          <button type="button" className="inline-link cart__remove" onClick={() => cart.remove(sku)}>
            Remove<span className="visually-hidden"> {label}</span>
          </button>
        </div>
      </div>
    </li>
  );
}

/** A frame comes empty: say so, and offer the print that fills it, sized already. */
function FrameNote({ frame, quantity, inCart }: { frame: FrameNeeds; quantity: number; inCart: ReadonlySet<string> }) {
  const { print } = frame;
  const size = cmLabel(frame.size);
  const dealPrice = useDealPrice();
  if (framePrint(frame, inCart) === "in-cart") {
    return <p className="cart__takes">With a {size} print, in your cart</p>;
  }
  return (
    <div className="cart__frame">
      <p className="cart__takes">Print not included</p>
      {print ? (
        <button
          type="button"
          className="cart__addprint"
          onClick={() => cart.add({ ...print, quantity }, { quiet: true })}
        >
          <Plus size={18} />
          Add a {size} print of your photo
          <span>{rands(dealPrice(print.sku, print.price))}</span>
        </button>
      ) : null}
    </div>
  );
}
