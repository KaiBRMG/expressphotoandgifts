"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { rands } from "@/lib/catalog/listing";
import { fittedUrl, THUMB } from "@/lib/checkout/photoUrls";
import type { AccountOrder, Standing } from "@/lib/account/orders";
import { cart, useCart } from "@/app/site/cartStore";
import { Alert, Check, Rotate } from "@/app/site/icons";
import { Note } from "@/app/checkout/Field";
import { ProductImage } from "@/app/site/ProductImage";
import { photos } from "@/app/checkout/photoStore";
import { deletePhotosAction, reorderAction } from "./actions";
import { OFFLINE } from "./Panels";

/** One row of the history, as the server hands it over: no token, no tracking, and the date written out ("20 Oct 2026"). */
export type OrderRow = Omit<AccountOrder, "at" | "live" | "tracking" | "token" | "updatedAt"> & { when: string };

const photosWord = (n: number) => (n === 1 ? "1 photo" : `${n} photos`);

/** Rows shown at first, and added by each "Show older". */
const PAGE = 10;

type Said = { ref: string; text: string; error?: boolean };

/**
 * The account's orders, newest first, each shown by the customer's own
 * prints: the thing they remember it by. Each row opens its receipt or puts
 * the order back in the cart with its photos.
 */
export function OrderList({ orders }: { orders: OrderRow[] }) {
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const locked = busy !== null || undefined;
  const { lines } = useCart();
  const router = useRouter();

  async function forget(ref: string) {
    if (busy) return;
    setBusy(ref);
    setSaid(null);
    const r = await deletePhotosAction(ref).catch(() => OFFLINE);
    setBusy(null);
    if ("error" in r) return setSaid({ ref, text: r.error, error: true });
    setAsking(null);
    setSaid({ ref, text: "Your photos for this order are deleted." });
    router.refresh();
  }

  async function again(ref: string) {
    if (busy) return;
    setBusy(ref);
    setSaid(null);
    const r = await reorderAction(ref).catch(() => OFFLINE);
    setBusy(null);
    if ("error" in r) return setSaid({ ref, text: r.error, error: true });

    photos.reuse(r, Object.fromEntries(lines.map((l) => [l.sku, l.quantity])));
    for (const line of r.lines) cart.add(line, { quiet: true });
    cart.open();

    const joined = lines.length > 0;
    setSaid({
      ref,
      text: [
        r.photos.length > 0 ? "In your cart, with your photos in place. Change any of them before you pay." : "In your cart.",
        joined ? "It’s added to what was already there." : "",
        r.missing > 0 ? `${r.missing === 1 ? "One photo is" : `${r.missing} photos are`} no longer kept, so ${r.missing === 1 ? "that place is" : "those places are"} empty.` : "",
        r.left.length > 0 ? `Left out: ${r.left.join("; ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  if (orders.length === 0) {
    return (
      <div className="aorders__none">
        <p>Your orders will show here, each with its receipt and tracking.</p>
        <Link className="inline-link" href="/shop">
          Find something to make
        </Link>
      </div>
    );
  }

  const rest = orders.length - shown;
  return (
    <>
      <ol className="aorders">
        {orders.slice(0, shown).map((o) => (
          <li key={o.ref} className="aorder">
            <Prints order={o} />
            <div className="aorder__what">
              <p className="aorder__head">
                <span>{o.when}</span>
                <span className="aorder__ref">{o.ref}</span>
              </p>
              <p className="aorder__items">
                {o.items.slice(0, 2).join(", ")}
                {o.items.length > 2 ? `, and ${o.items.length - 2} more` : ""}
              </p>
              <p className="aorder__standing" data-tone={o.standing.tone}>
                <StandingMark tone={o.standing.tone} />
                {o.standing.label}
              </p>
              {o.deleted ? <p className="aorder__items">Photos deleted. The order is kept as the shop’s record.</p> : null}
              {o.kept > 0 ? <p className="aorder__items">The shop is keeping {photosWord(o.kept)} for this order until you delete them.</p> : null}
            </div>
            <p className="aorder__total">{rands(o.total)}</p>
            <div className="aorder__acts">
              <button type="button" className="pillbtn" aria-disabled={locked} onClick={() => again(o.ref)}>
                <Rotate size={18} />
                {busy === o.ref ? "Adding…" : "Order again"}
              </button>
              <Link className="inline-link" href={o.receipt}>
                Receipt<span className="visually-hidden"> for {o.ref}</span>
              </Link>
              {o.kept > 0 ? (
                <button type="button" className="inline-link" aria-disabled={locked} onClick={() => setAsking(asking === o.ref ? null : o.ref)} aria-expanded={asking === o.ref}>
                  Delete photos<span className="visually-hidden"> for {o.ref}</span>
                </button>
              ) : null}
            </div>
            {asking === o.ref ? (
              <div className="aorder__ask" role="group" aria-label={`Delete the photos for ${o.ref}`}>
                <p>
                  Delete the {photosWord(o.kept)} kept for {o.ref}? This can’t be undone, and Order again won’t be able to bring them back. The order and its receipt stay.
                </p>
                <div className="aorder__askActs">
                  <button type="button" className="pillbtn" onClick={() => setAsking(null)}>
                    Keep them
                  </button>
                  <button type="button" className="pillbtn" aria-disabled={locked} onClick={() => forget(o.ref)}>
                    {busy === o.ref ? "Deleting…" : "Yes, delete them"}
                  </button>
                </div>
              </div>
            ) : null}
            {said?.ref === o.ref ? (
              <Note error={said.error} className="anote">
                {said.text}
              </Note>
            ) : null}
          </li>
        ))}
      </ol>
      {rest > 0 ? (
        <button type="button" className="pillbtn aorders__more" onClick={() => setShown((n) => n + PAGE)}>
          Show older orders
          <span className="aorders__count">{rest}</span>
        </button>
      ) : null}
    </>
  );
}

function StandingMark({ tone }: { tone: Standing["tone"] }) {
  if (tone === "now") return <span className="aorder__dot" aria-hidden="true" />;
  if (tone === "done") return <Check size={16} />;
  if (tone === "problem") return <Alert size={16} />;
  return null;
}

/** The order's prints, laid on the counter: up to three, each a little askew; the product's own photo when none took a photo. */
function Prints({ order }: { order: OrderRow }) {
  if (order.prints.length === 0) {
    return (
      <span className="aorder__prints aorder__prints--product" aria-hidden="true">
        {order.product ? <ProductImage code={order.product} alt="" fill sizes="88px" /> : null}
      </span>
    );
  }
  return (
    <span className="aorder__prints" data-n={order.prints.length} aria-hidden="true">
      {order.prints.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element -- a customer photo at the step's one thumbnail size, from Cloudinary as is
        <img key={p.publicId} className="aorder__print" src={fittedUrl(p.publicId, p.version, THUMB)} alt="" loading="lazy" decoding="async" />
      ))}
    </span>
  );
}
