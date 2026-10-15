"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cartSubtotal, cartUnits, liveLines, unitsLabel, type CartLine } from "@/lib/catalog/cart";
import { framePrint, type FrameNeeds, type Needs } from "@/lib/catalog/checkout";
import { cmLabel } from "@/lib/catalog/sizes";
import { itemCount, productHref, rands } from "@/lib/catalog/listing";
import { cart, useCart } from "./cartStore";
import { ArrowRight, Cart as CartIcon, Close, Plus, Upload, YourPhoto } from "./icons";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";

/**
 * The dock's pill. With something in the cart it is the cart, with the count
 * of units on it, and opens the drawer; otherwise it is Shop now, or nothing
 * inside the shop, where Shop now would point at the page it is on. It stays
 * while the drawer is open even if the last line is removed, so the drawer's
 * focus has somewhere to return to; it leaves when the drawer closes.
 */
export function DockAction({ shopAction }: { shopAction: boolean }) {
  const { lines, open, prices } = useCart();
  const units = cartUnits(liveLines(lines, prices));

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

let needsLoad: Promise<Needs | null> | null = null;

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
  const { lines, open, prices, was } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  const needs = useNeeds(open);
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
  const live = liveLines(lines, prices);
  const units = cartUnits(live);
  const photos = live.some((l) => l.takes);

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
            <ul className="cart__lines">
              {lines.map((line) => (
                <Line
                  key={line.sku}
                  line={line}
                  unavailable={!live.includes(line)}
                  was={was[line.sku]}
                  frame={needs?.[line.sku]?.frame}
                  inCart={skus}
                />
              ))}
            </ul>

            <footer className="cart__foot">
              {live.length > 0 ? (
                <>
                  <p className="slip__total" aria-live="polite">
                    <span>
                      Subtotal <span className="cart__excl">before delivery</span>
                    </span>
                    <strong>{rands(cartSubtotal(live))}</strong>
                  </p>
                  {photos ? (
                    <>
                      <Link className="btn btn--gold on-gold cart__order" href="/checkout" onClick={cart.close}>
                        <Upload size={19} />
                        Add your photos
                      </Link>
                      <p className="cart__note">
                        Place each photo on what it goes on and check it prints sharply. Then your
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

function Line({
  line,
  unavailable,
  was,
  frame,
  inCart,
}: {
  line: CartLine;
  unavailable: boolean;
  was?: number;
  /** For a frame: the size it holds and the print that fills it. */
  frame?: FrameNeeds;
  inCart: ReadonlySet<string>;
}) {
  const { sku, slug, name, variant, price, quantity, photo, takes } = line;
  const href = productHref(slug);
  const label = variant ? `${name}, ${variant}` : name;

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
        {unavailable ? (
          <p className="cart__flag">No longer available, so it&rsquo;s left out of your order.</p>
        ) : was !== undefined ? (
          <p className="cart__flag">
            Price changed from {rands(was)} to {rands(price)} each.
          </p>
        ) : null}

        <div className="cart__row">
          {unavailable ? null : (
            <QuantityStepper value={quantity} onChange={(n) => cart.setQuantity(sku, n)} label={label} />
          )}
          <button type="button" className="inline-link cart__remove" onClick={() => cart.remove(sku)}>
            Remove<span className="visually-hidden"> {label}</span>
          </button>
          {unavailable ? null : <p className="cart__price">{rands(price * quantity)}</p>}
        </div>
      </div>
    </li>
  );
}

/** A frame comes empty: say so, and offer the print that fills it, sized already. */
function FrameNote({ frame, quantity, inCart }: { frame: FrameNeeds; quantity: number; inCart: ReadonlySet<string> }) {
  const { print } = frame;
  const size = cmLabel(frame.size);
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
          <span>{rands(print.price)}</span>
        </button>
      ) : null}
    </div>
  );
}
