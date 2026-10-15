"use client";

import { useId, type CSSProperties, type DragEvent } from "react";

import { areaLabel, DEFAULT_EDIT, fit, framePrint, freshEdit, placedArea, TRIM_NOTE, wholePhoto, WORDS_MAX } from "@/lib/catalog/checkout";
import { rands } from "@/lib/catalog/listing";
import { MAX_QUANTITY } from "@/lib/catalog/purchase";
import { cmLabel } from "@/lib/catalog/sizes";
import { cart } from "@/app/site/cartStore";
import { Alert, Check, Plus } from "@/app/site/icons";
import { ProductImage } from "@/app/site/ProductImage";
import { QuantityStepper } from "@/app/site/QuantityStepper";
import { Cropped } from "./Cropped";
import { photoSrc, WORKING } from "./images";
import { DRAG_TYPE, renderOf, slotId, target, type Row } from "./model";
import { photos, type Photo, type PhotoState, type Placed, type Target } from "./photoStore";

/** What a tap on a slot asks for: whatever suits it, or explicitly the editor or a replacement. */
export type SlotAction = "tap" | "edit" | "replace";

/* ---- The card's head, shared by every kind of line --------------------- */

function Head({ row, titleId }: { row: Row; titleId: string }) {
  const { line } = row;
  return (
    <header className="pitem__head">
      <span className="pitem__thumb">
        {line.photo ? <ProductImage code={line.photo} alt="" fill sizes="64px" /> : null}
      </span>
      <div className="pitem__what">
        <h2 id={titleId} className="pitem__name">
          {line.name}
        </h2>
        <p className="pitem__meta">{[line.variant, line.takes].filter(Boolean).join(" · ")}</p>
      </div>
      <p className="pitem__price">{rands(line.price * line.quantity)}</p>
    </header>
  );
}

/** A row of radio pills, as the product page draws a choice. */
function Pills<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="pills">
      <legend className="pills__legend">{legend}</legend>
      <div className="pills__row">
        {options.map((o) => (
          <label key={o.value} className="pill">
            <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---- A line that takes photos ----------------------------------------- */

export function PhotoItem({
  row,
  store,
  onSlot,
}: {
  row: Row;
  store: PhotoState;
  onSlot: (t: Target, action: SlotAction) => void;
}) {
  const titleId = useId();
  const { line, state } = row;
  const { armed } = store;
  const photo = row.needs!.photo!;
  const n = photo.slots.length;
  const byId = new Map(store.photos.map((p) => [p.id, p]));
  const many = line.quantity > 1;

  const layout = photo.layouts.find((l) => l.sku === line.sku);
  const switchLayout = (sku: string) => {
    const next = photo.layouts.find((l) => l.sku === sku);
    if (!next) return;
    photos.move(line.sku, sku);
    cart.swap(line.sku, next.line);
  };

  /** Each tray photo to one print, quantity to match: ten photos, ten prints. */
  const onePerPhoto = () => {
    const tray = store.photos.slice(0, MAX_QUANTITY);
    const need = photo.slots[0];
    cart.setQuantity(line.sku, tray.length);
    photos.setLine(line.sku, {
      ...state,
      each: true,
      sets: tray.map((p) => [{ photo: p.id, edit: p.px ? freshEdit(p.px, need, photo.kind) : DEFAULT_EDIT }]),
      words: tray.map(() => ""),
    });
  };

  /** The set's empty slots, from the tray in order, skipping photos the set already has. */
  const fillFromTray = (set: number) => {
    const have = new Set(state.sets[set].flatMap((p) => (p ? [p.photo] : [])));
    const free = store.photos.filter((p) => !have.has(p.id));
    const empty = state.sets[set].flatMap((p, j) => (p ? [] : [j]));
    photos.placeEach(empty.slice(0, free.length).map((j, k) => ({ id: free[k].id, target: target(row, photo, set, j) })));
  };

  return (
    <article className="pitem" aria-labelledby={titleId}>
      <Head row={row} titleId={titleId} />

      <div className="pitem__controls">
        <div className="pitem__qty">
          <span className="pills__legend" aria-hidden="true">
            Quantity
          </span>
          <QuantityStepper value={line.quantity} onChange={(q) => cart.setQuantity(line.sku, q)} label={line.name} />
        </div>
        {layout && photo.layouts.length > 1 ? (
          <Pills
            legend="Photos"
            options={photo.layouts.map((l) => ({ value: l.sku, label: l.label }))}
            value={line.sku}
            onChange={switchLayout}
          />
        ) : null}
        {many ? (
          <Pills
            legend={`Photos on all ${line.quantity}`}
            options={[
              { value: "same", label: "The same on all" },
              { value: "each", label: "Different on each" },
            ]}
            value={state.each ? "each" : "same"}
            onChange={(v) => photos.setEach(line.sku, v === "each", line.quantity, n)}
          />
        ) : null}
      </div>

      {photo.perPhoto && store.photos.length > 1 && !(state.each && line.quantity === store.photos.length) ? (
        <p className="pitem__offer">
          <button type="button" className="inline-link" onClick={onePerPhoto}>
            Make one print of each of your photos
          </button>{" "}
          <span>
            ({Math.min(MAX_QUANTITY, store.photos.length)} prints, {rands(line.price * Math.min(MAX_QUANTITY, store.photos.length))})
          </span>
        </p>
      ) : null}

      {state.sets.map((set, i) => {
        const empties = set.filter((p) => !p).length;
        return (
          <div className="pset" key={i}>
            {state.each && many ? (
              <p className="pset__title">
                No. {i + 1}
                <span> of {line.quantity}</span>
              </p>
            ) : null}
            <ul className="slots" data-many={n > 4 || undefined}>
              {set.map((placed, j) => (
                <Slot
                  key={j}
                  t={target(row, photo, i, j)}
                  placed={placed}
                  photo={placed ? byId.get(placed.photo) : undefined}
                  armed={armed}
                  bakes={store.bakes}
                  onSlot={onSlot}
                />
              ))}
            </ul>
            {n > 1 && empties > 0 && store.photos.length > 0 && !armed ? (
              <button type="button" className="inline-link pset__fill" onClick={() => fillFromTray(i)}>
                {empties === 1 ? "Fill the empty place" : `Fill the ${empties} empty places`} from your photos
              </button>
            ) : null}
            {photo.text ? (
              <Words
                value={state.words[i] ?? ""}
                onChange={(v) => photos.setWords(line.sku, i, v, line.quantity, n)}
                which={state.each && many ? `No. ${i + 1}` : null}
              />
            ) : null}
          </div>
        );
      })}
    </article>
  );
}

function Words({ value, onChange, which }: { value: string; onChange: (v: string) => void; which: string | null }) {
  const id = useId();
  return (
    <div className="words">
      <label htmlFor={id} className="words__label">
        Words to add{which ? `, ${which}` : ""} <span>optional: a name, a date or a short message</span>
      </label>
      <input
        id={id}
        className="words__input"
        type="text"
        maxLength={WORDS_MAX}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {value.length > WORDS_MAX - 20 ? (
        <p className="words__count">
          {WORDS_MAX - value.length} {WORDS_MAX - value.length === 1 ? "character" : "characters"} left
        </p>
      ) : null}
    </div>
  );
}

/* ---- One place a photo goes ------------------------------------------- */

function Slot({
  t,
  placed,
  photo,
  armed,
  bakes,
  onSlot,
}: {
  t: Target;
  placed: Placed | null;
  photo: Photo | undefined;
  armed: string | null;
  bakes: PhotoState["bakes"];
  onSlot: (t: Target, action: SlotAction) => void;
}) {
  const need = t.need;
  const edit = placed?.edit;
  const area = placedArea(need, edit ?? { turned: false });
  const aspect = area ? area.w / area.h : photo?.px ? photo.px.w / photo.px.h : 1;
  const size = areaLabel(need, edit);
  const f = placed && photo?.px ? fit(photo.px, need, placed.edit) : null;
  const src = photo ? photoSrc(photo, WORKING) : null;
  const filled = Boolean(placed && photo);
  const render = placed && photo ? renderOf(photo, need, placed.edit, bakes) : null;

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE) || e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_TYPE);
    if (id) return photos.place(id, [t]);
    const [first] = photos.add(e.dataTransfer.files);
    if (first) photos.place(first, [t]);
  };

  const name = `${need.label}${size ? `, ${size}` : ""}`;
  const label = armed
    ? `Put the photo here: ${name}`
    : filled
      ? `${name}: ${photo!.name}. Edit or replace`
      : `${name}: empty. Choose a photo`;

  return (
    <li className="slot" data-shape={need.shape} style={{ "--a": aspect } as CSSProperties}>
      <button
        id={slotId(t)}
        type="button"
        className="slot__face"
        data-filled={filled || undefined}
        aria-label={label}
        onClick={() => onSlot(t, "tap")}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {filled && src && photo?.px ? (
          <Cropped src={src} px={photo.px} need={need} edit={placed!.edit} />
        ) : filled ? (
          <span className="slot__wait">Preparing preview…</span>
        ) : (
          <span className="slot__add" aria-hidden="true">
            {armed ? <Check size={22} /> : <Plus size={22} />}
            {armed ? "Place here" : "Add photo"}
          </span>
        )}
        {photo && photo.status !== "done" && photo.status !== "error" ? (
          <span className="slot__bar" style={{ "--p": photo.progress } as CSSProperties} aria-hidden="true" />
        ) : null}
      </button>

      <p className="slot__label">
        {need.label}
        {size ? <span className="slot__size">{size}</span> : null}
      </p>

      {photo?.status === "error" ? (
        <p className="slot__note">
          <Alert size={18} />
          <span>
            This photo didn&rsquo;t reach the shop.{" "}
            <button type="button" className="inline-link" onClick={() => photos.retry(photo.id)}>
              Try again
            </button>
          </span>
        </p>
      ) : null}

      {render?.bake?.status === "error" ? (
        <p className="slot__note">
          <Alert size={18} />
          <span>
            Your edit didn&rsquo;t reach the shop.{" "}
            <button type="button" className="inline-link" onClick={() => photos.retryBake(render.key)}>
              Try again
            </button>
          </span>
        </p>
      ) : render && render.bake?.status !== "done" ? (
        <p className="slot__note slot__note--quiet">Saving your edit…</p>
      ) : !render && f?.bordered && placed ? (
        <p className="slot__note slot__note--quiet">
          <span>
            Your whole photo, with white borders.{" "}
            <button
              type="button"
              className="inline-link"
              onClick={() => photos.edit([t], { ...placed.edit, zoom: 1 })}
            >
              Fill to the edges
            </button>
          </span>
        </p>
      ) : f && placed && f.trimmed > TRIM_NOTE && f.box.zoom === 1 && placed.edit.x === 0.5 && placed.edit.y === 0.5 ? (
        <p className="slot__note slot__note--quiet">
          <span>
            Edges trimmed to fit.{" "}
            <button type="button" className="inline-link" onClick={() => onSlot(t, "edit")}>
              Choose what&rsquo;s kept
            </button>
            , or{" "}
            <button type="button" className="inline-link" onClick={() => photos.edit([t], wholePhoto(photo!.px!, need, placed.edit))}>
              show the whole photo
            </button>{" "}
            with white borders.
          </span>
        </p>
      ) : null}
    </li>
  );
}

/* ---- A frame: the print is not included -------------------------------- */

export function FrameItem({ row, inCart }: { row: Row; inCart: ReadonlySet<string> }) {
  const titleId = useId();
  const { line, state } = row;
  const frame = row.needs!.frame!;
  const size = cmLabel(frame.size);
  const print = frame.print;
  const printIn = framePrint(frame, inCart) === "in-cart";

  return (
    <article className="pitem pitem--frame" aria-labelledby={titleId}>
      <Head row={row} titleId={titleId} />
      <div className="frameoffer">
        <span className="frameslot" style={{ "--a": frame.size.w / frame.size.h } as CSSProperties} aria-hidden="true">
          <span className="frameslot__print" data-in={printIn || undefined}>
            {printIn ? <Check size={22} /> : null}
            <span className="frameslot__size">{size}</span>
          </span>
        </span>

        <div className="frameoffer__copy">
          {state.empty ? (
            <p>
              You&rsquo;re taking the frame empty.{" "}
              <button type="button" className="inline-link" onClick={() => photos.flag(line.sku, { empty: false })}>
                Add a print after all
              </button>
            </p>
          ) : printIn ? (
            <p className="frameoffer__done">
              <Check size={20} />
              <span>
                A {size} print is in your order. Choose its photo above and it goes in this frame.
              </span>
            </p>
          ) : print ? (
            <>
              <p className="frameoffer__title">Print not included</p>
              <p>The frame comes empty. Add a {size} print of your own photo to go in it.</p>
              <div className="frameoffer__acts">
                <button
                  type="button"
                  className="btn btn--blue"
                  onClick={() => cart.add({ ...print, quantity: line.quantity }, { quiet: true })}
                >
                  <Plus size={19} />
                  Add a {size} print · {rands(print.price * line.quantity)}
                </button>
                <button type="button" className="inline-link" onClick={() => photos.flag(line.sku, { empty: true })}>
                  Keep it empty
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="frameoffer__title">Print not included</p>
              <p>
                Prints aren&rsquo;t on sale online yet. The shop can print one of your photos to fit this
                frame.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={Boolean(state.quote)}
                  onChange={(e) => photos.flag(line.sku, { quote: e.target.checked })}
                />
                Ask the shop to quote a {size} print
              </label>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---- Everything that needs nothing ------------------------------------- */

export function PlainItems({ rows }: { rows: Row[] }) {
  return (
    <section className="plain" aria-labelledby="plain-title">
      <h2 id="plain-title" className="plain__title">
        Nothing needed from you
      </h2>
      <ul>
        {rows.map(({ line }) => (
          <li key={line.sku}>
            <span>
              {line.quantity} × {line.name}
              {line.variant ? <span className="plain__variant"> · {line.variant}</span> : null}
            </span>
            <span className="plain__price">{rands(line.price * line.quantity)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
