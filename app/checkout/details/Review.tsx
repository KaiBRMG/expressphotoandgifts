import Link from "next/link";
import { memo, useId, useState, type CSSProperties } from "react";

import { placedArea } from "@/lib/catalog/checkout";
import { rands } from "@/lib/catalog/listing";
import { cmLabel } from "@/lib/catalog/sizes";
import { LIMITS } from "@/lib/checkout/details";
import { Plus } from "@/app/site/icons";
import { useUnitPrice } from "@/app/site/cartStore";
import { ProductImage } from "@/app/site/ProductImage";
import { Cropped } from "../Cropped";
import { CharsLeft, Field } from "../Field";
import { THUMB } from "@/lib/checkout/photoUrls";
import { photoSrc } from "../images";
import type { Row } from "../model";
import { photos as photoActions, type Photo } from "../photoStore";

/**
 * The order once more before paying: each line at its price, and under a
 * line that takes photos, every place as a small print cut exactly as it
 * will be made, so the last thing the customer sees is their own pictures.
 * Every line can carry a short note to the shop.
 */
export const Review = memo(function Review({ rows, photos }: { rows: Row[]; photos: Photo[] }) {
  const byId = new Map(photos.map((p) => [p.id, p]));
  const unit = useUnitPrice();
  return (
    <ul className="review">
      {rows.map(({ line, needs, state }) => {
        const photo = needs?.photo;
        const frame = needs?.frame;
        const many = state.each && line.quantity > 1;
        return (
          <li key={line.sku} className="review__line">
            <span className="review__thumb" aria-hidden="true">
              {line.photo ? <ProductImage code={line.photo} alt="" fill sizes="56px" /> : null}
            </span>
            <div className="review__what">
              <p className="review__name">{line.name}</p>
              <p className="review__meta">
                {[line.variant, `${line.quantity} × ${rands(unit(line))}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <p className="review__price">{rands(unit(line) * line.quantity)}</p>

            {photo ? (
              <div className="review__sets">
                {state.sets.map((set, i) => (
                  <div key={i} className="review__set">
                    {many ? <p className="review__setName">No. {i + 1}</p> : null}
                    <ul className="proofs" aria-label={many ? `Photos on no. ${i + 1}` : "Your photos on it"}>
                      {set.map((placed, j) => {
                        const p = placed ? byId.get(placed.photo) : undefined;
                        const need = photo.slots[j];
                        const area = placedArea(need, placed?.edit ?? { turned: false });
                        const aspect = area ? area.w / area.h : p?.px ? p.px.w / p.px.h : 1;
                        const src = p ? photoSrc(p, THUMB) : null;
                        return (
                          <li key={j} className="proof" data-shape={need.shape} style={{ "--a": aspect } as CSSProperties}>
                            <span className="proof__face">
                              {placed && p?.px && src ? <Cropped src={src} px={p.px} need={need} edit={placed.edit} /> : null}
                            </span>
                            <span className="proof__label">{need.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                    {state.words[i]?.trim() ? <p className="review__words">&ldquo;{state.words[i].trim()}&rdquo;</p> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {frame && state.empty ? <p className="review__note">Frame only, no print.</p> : null}
            {frame && state.quote && !frame.print ? (
              <p className="review__note">You&rsquo;ve asked us to quote a {cmLabel(frame.size)} print to go in it.</p>
            ) : null}

            <LineNote sku={line.sku} name={line.name} value={state.note ?? ""} />
          </li>
        );
      })}
      {rows.some((r) => r.needs?.photo) ? (
        <li className="review__change">
          <Link className="inline-link" href="/checkout">
            Change your photos
          </Link>
        </li>
      ) : null}
    </ul>
  );
});

/**
 * A note to the shop about one line, behind a quiet "Add a note" so a
 * customer with nothing to say passes it by. It opens on its own when a
 * note is already there, and folds away again when left empty.
 */
function LineNote({ sku, name, value }: { sku: string; name: string; value: string }) {
  const id = useId();
  // Opened just now by the customer: shown while still empty, and takes the focus as it appears.
  const [asked, setAsked] = useState(false);

  if (!asked && !value) {
    return (
      <p className="memo">
        <button type="button" className="inline-link memo__add" onClick={() => setAsked(true)}>
          <Plus size={18} />
          Add a note<span className="visually-hidden"> about {name}</span>
        </button>
      </p>
    );
  }

  return (
    <div className="memo">
      <Field id={id} label="Note for the shop" hint="read by us, not printed">
        <textarea
          id={id}
          autoFocus={asked}
          className="field__input memo__input"
          rows={2}
          maxLength={LIMITS.lineNote}
          placeholder="Anything we should know about this one"
          value={value}
          onChange={(e) => photoActions.flag(sku, { note: e.target.value })}
          onBlur={() => {
            if (value.trim()) return;
            if (value) photoActions.flag(sku, { note: "" });
            setAsked(false);
          }}
        />
      </Field>
      <CharsLeft value={value} max={LIMITS.lineNote} />
    </div>
  );
}
