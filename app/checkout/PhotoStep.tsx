"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { liveLines } from "@/lib/catalog/cart";
import type { Needs } from "@/lib/catalog/checkout";
import { cart, useCart } from "@/app/site/cartStore";
import { ArrowRight } from "@/app/site/icons";
import { track } from "@/app/site/track";
import { Chooser } from "./Chooser";
import { Editor } from "./Editor";
import { CheckoutHead } from "./Head";
import { FrameItem, PhotoItem, PlainItems, type SlotAction } from "./Item";
import { allTargets, problems, progress, rowsFor, slotId, useHydrated } from "./model";
import { photos, usePhotos, type Target } from "./photoStore";
import { Tray } from "./Tray";

/**
 * Checkout's photo step: every line of the cart that needs something from
 * the customer, drawn as the places their photos go, beside one tray of
 * photos to place from. A photo can go in as many places as the customer
 * likes; nothing is uploaded twice.
 *
 * Once every place is filled and every file has reached the shop, the step
 * goes on to the customer's details, delivery and payment.
 */
export function PhotoStep({ needs }: { needs: Needs }) {
  const router = useRouter();
  const { lines, prices, available } = useCart();
  const store = usePhotos();
  const [chooser, setChooser] = useState<Target | null>(null);
  const [editing, setEditing] = useState<{ t: Target; photo?: string } | null>(null);
  const ready = useHydrated();

  useEffect(() => {
    cart.checkPrices();
  }, []);

  const live = useMemo(() => liveLines(lines, prices, available), [lines, prices, available]);
  const started = ready && live.length > 0;
  useEffect(() => {
    if (started) track({ step: "checkout" });
  }, [started]);
  const rows = useMemo(() => rowsFor(live, needs, store.lines), [live, needs, store.lines]);
  const prog = useMemo(() => progress(rows, store.photos, store.bakes), [rows, store.photos, store.bakes]);

  // Every edited place gets its own full-resolution file; untouched places send the original.
  useEffect(() => {
    photos.ensureBakes(
      allTargets(rows).flatMap((t) => {
        const placed = rows.find((r) => r.line.sku === t.sku)?.state.sets[t.set][t.slot];
        return placed ? [{ photo: placed.photo, need: t.need, edit: placed.edit }] : [];
      }),
    );
  }, [rows, store.photos, store.bakes]);
  const inCart = useMemo(() => new Set(live.map((l) => l.sku)), [live]);

  // Escape puts a picked-up photo down.
  useEffect(() => {
    if (!store.armed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && photos.arm(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store.armed]);

  if (!ready) return <Head filled={0} total={0} />;

  const photoRows = rows.filter((r) => r.needs?.photo);
  const frameRows = rows.filter((r) => r.needs?.frame && !r.needs.photo);
  const plainRows = rows.filter((r) => !r.needs);

  if (live.length === 0) {
    return (
      <>
        <Head filled={0} total={0} />
        <div className="shell ck__empty">
          <p>Your cart is empty, so there&rsquo;s nothing to add photos to yet.</p>
          <Link className="btn btn--gold on-gold" href="/shop">
            Browse the shop
            <ArrowRight size={17} />
          </Link>
        </div>
      </>
    );
  }

  /** A tap on a slot places the photo in hand, or opens the editor on a filled slot, or the chooser on an empty one. */
  const onSlot = (t: Target, action: SlotAction) => {
    const filled = Boolean(store.lines[t.sku]?.sets[t.set]?.[t.slot]);
    if (action === "tap" && store.armed) photos.place(store.armed, [t]);
    else if (action === "edit" || (action === "tap" && filled)) setEditing({ t });
    else setChooser(t);
  };

  const issues = problems(prog);
  const targets = allTargets(rows);

  /**
   * The tray's edit mark: the photo where it already is, or, not placed yet,
   * previewed in the first empty place (or the first place of all), which it
   * fills only if the customer presses Done.
   */
  const editPhoto = (id: string) => {
    const where = targets.find((t) => rows.find((r) => r.line.sku === t.sku)?.state.sets[t.set][t.slot]?.photo === id);
    const t = where ?? prog.empty[0] ?? targets[0];
    if (t) setEditing({ t, photo: id });
  };
  const blocked = issues.length > 0;
  const show = (t: Target) => document.getElementById(slotId(t))?.scrollIntoView({ behavior: "smooth", block: "center" });
  const send = () => {
    if (blocked) return show(issues[0].t);
    router.push("/checkout/details");
  };

  return (
    <>
      <Head filled={prog.filled} total={prog.total} />

      <div className="shell ck__grid" data-armed={store.armed ? "" : undefined}>
        <div className="ck__items">
          {photoRows.length === 0 && frameRows.length === 0 ? (
            <p className="ck__none">Nothing in your cart needs a photo. Your order is ready for your details.</p>
          ) : null}

          {photoRows.map((row) => (
            <PhotoItem
              key={row.line.sku}
              row={row}
              store={store}
              onSlot={onSlot}
            />
          ))}

          {frameRows.map((row) => (
            <FrameItem key={row.line.sku} row={row} inCart={inCart} />
          ))}

          {plainRows.length > 0 ? <PlainItems rows={plainRows} /> : null}
        </div>

        <Tray
          store={store}
          prog={prog}
          issues={issues}
          onEdit={targets.length > 0 ? editPhoto : undefined}
          onSend={send}
          onShow={show}
        />
      </div>

      {chooser ? (
        <Chooser
          target={chooser}
          store={store}
          onClose={() => setChooser(null)}
        />
      ) : null}

      {editing ? (
        <Editor
          key={`${slotId(editing.t)}-${editing.photo ?? ""}`}
          target={editing.t}
          photoId={editing.photo}
          rows={rows}
          store={store}
          onClose={() => setEditing(null)}
          onReplace={() => {
            setChooser(editing.t);
            setEditing(null);
          }}
        />
      ) : null}

      <p className="visually-hidden" aria-live="polite" key={store.said.n}>
        {store.said.text}
      </p>
    </>
  );
}

function Head({ filled, total }: { filled: number; total: number }) {
  return (
    <CheckoutHead
      step="photos"
      title="Add your photos"
      lede={
        <>
          Each item below has a place for every photo it takes, drawn in the shape it&rsquo;ll print. Add a photo
          once and use it in as many places as you like.
        </>
      }
      aside={
        total > 0 ? (
          <p className="ckhead__count" aria-live="polite">
            <strong>
              {filled}
              <span> / {total}</span>
            </strong>
            places filled
          </p>
        ) : null
      }
    />
  );
}
