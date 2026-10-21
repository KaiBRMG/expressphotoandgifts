"use client";

import { useRef, useState, type CSSProperties, type DragEvent } from "react";

import { cartSubtotal, type CartLine } from "@/lib/catalog/cart";
import { photoCount } from "@/lib/catalog/listing";
import { rands } from "@/lib/catalog/listing";
import { ArrowRight, Pencil, Trash, Upload } from "@/app/site/icons";
import { THUMB } from "@/lib/checkout/photoUrls";
import { photoSrc } from "./images";
import { useDockHeight } from "./draft";
import { DRAG_TYPE, type Progress } from "./model";
import { photos, type Photo, type PhotoState, type Target } from "./photoStore";

/** The file picker, as a gold pill: the step's one standing action until every photo is placed. */
export function AddPhotos({ label = "Add photos", onAdded }: { label?: string; onAdded?: (ids: string[]) => void }) {
  return (
    <label className="btn btn--gold on-gold addphotos">
      <Upload size={19} />
      {label}
      <input
        type="file"
        multiple
        accept="image/*,.heic,.heif"
        className="visually-hidden"
        onChange={(e) => {
          if (e.target.files) {
            const ids = photos.add(e.target.files);
            onAdded?.(ids);
          }
          e.target.value = "";
        }}
      />
    </label>
  );
}

/**
 * The customer's photos, on the header's blue: beside the items from a wide
 * screen, docked at the foot of a phone's. Tap one to pick it up, then tap
 * every place it should go; or drag it there. Below, how much is placed, what
 * still stands in the way, and the way out.
 */
export function Tray({
  store,
  prog,
  live,
  issues,
  onEdit,
  onSend,
  onShow,
}: {
  store: PhotoState;
  prog: Progress;
  live: CartLine[];
  /** What still stands in the way, from `problems`. */
  issues: { text: string; t: Target }[];
  /** Opens the editor on a photo; absent when nothing on the order takes one. */
  onEdit?: (id: string) => void;
  onSend: () => void;
  onShow: (t: Target) => void;
}) {
  const trayRef = useRef<HTMLElement>(null);
  useDockHeight(trayRef);
  const [dropping, setDropping] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const armed = store.armed ? store.photos.find((p) => p.id === store.armed) : undefined;
  const armedUses = armed ? (prog.uses.get(armed.id) ?? 0) : 0;
  const emptyTargets = prog.empty;
  const blocked = issues.length > 0;

  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    setDropping(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    photos.add(e.dataTransfer.files);
  };

  return (
    <aside
      ref={trayRef}
      className="tray on-dark"
      aria-labelledby="tray-title"
      data-dropping={dropping || undefined}
      onDragOver={onDragOver}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <div className="tray__head">
        <h2 id="tray-title" className="tray__title">
          Your photos
          {store.photos.length > 0 ? <span className="tray__n">{store.photos.length}</span> : null}
        </h2>
        <AddPhotos />
      </div>

      {store.photos.length === 0 ? (
        <p className="tray__hint">
          Choose them from your phone or computer<span className="tray__drop">, or drop them here</span>. One
          photo can go on as many things as you like.
        </p>
      ) : (
        <ul className="tray__grid" aria-label="Your photos">
          {store.photos.map((p) => (
            <Thumb key={p.id} photo={p} uses={prog.uses.get(p.id) ?? 0} armed={store.armed === p.id} onEdit={onEdit} />
          ))}
        </ul>
      )}

      {store.photos.length > 0 && !armed ? (
        <p className="tray__reset">
          {resetting ? (
            <>
              Remove all {photoCount(store.photos.length)}? Every place they fill will be emptied.{" "}
              <button
                type="button"
                className="inline-link"
                onClick={() => {
                  photos.reset();
                  setResetting(false);
                }}
              >
                Remove all
              </button>{" "}
              <button type="button" className="inline-link" onClick={() => setResetting(false)}>
                Keep them
              </button>
            </>
          ) : (
            <button type="button" className="inline-link" onClick={() => setResetting(true)}>
              Remove all photos
            </button>
          )}
        </p>
      ) : null}

      {armed ? (
        <div className="tray__armed" role="group" aria-label={`${armed.name}, picked up`}>
          <p className="tray__armedText">Now choose each place it should go.</p>
          <div className="tray__acts">
            {emptyTargets.length > 0 ? (
              <button type="button" className="tray__act" onClick={() => photos.place(armed.id, emptyTargets)}>
                Fill {emptyTargets.length === 1 ? "the empty place" : `all ${emptyTargets.length} empty places`}
              </button>
            ) : null}
            {confirming === armed.id ? (
              <button
                type="button"
                className="tray__act"
                onClick={() => {
                  photos.remove(armed.id);
                  setConfirming(null);
                }}
              >
                <Trash size={18} />
                Remove and empty {armedUses === 1 ? "its place" : `its ${armedUses} places`}
              </button>
            ) : (
              <button
                type="button"
                className="tray__act"
                onClick={() => (armedUses > 0 ? setConfirming(armed.id) : photos.remove(armed.id))}
              >
                <Trash size={18} />
                Remove
              </button>
            )}
            <button type="button" className="tray__act tray__act--done" onClick={() => photos.arm(null)}>
              Done
            </button>
          </div>
        </div>
      ) : null}

      <div className="tray__foot">
        {prog.total > 0 ? (
          <div className="tray__progress">
            <p>
              <strong>
                {prog.filled} of {prog.total}
              </strong>{" "}
              places filled
            </p>
            <span
              className="tray__meter"
              style={{ "--p": prog.filled / prog.total } as CSSProperties}
              aria-hidden="true"
            />
          </div>
        ) : null}

        {blocked ? (
          <ul className="tray__problems">
            {issues.map((p) => (
              <li key={p.text}>
                <button type="button" className="inline-link" onClick={() => onShow(p.t)}>
                  {p.text}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="slip__total tray__total">
          <span>
            Subtotal <span className="tray__excl">before delivery</span>
          </span>
          <strong>{rands(cartSubtotal(live))}</strong>
        </p>
        <button
          type="button"
          className="btn btn--gold on-gold tray__send"
          aria-disabled={blocked || undefined}
          aria-describedby="tray-note"
          onClick={onSend}
        >
          <span>
            Continue<span className="tray__sendMore"> to details</span>
          </span>
          <ArrowRight size={19} />
        </button>
        <p id="tray-note" className="tray__note">
          {blocked
            ? "You can go on once every place has a photo and every photo has uploaded."
            : "Next: your details, collection or delivery, and payment."}
        </p>
      </div>
    </aside>
  );
}

function Thumb({
  photo,
  uses,
  armed,
  onEdit,
}: {
  photo: Photo;
  uses: number;
  armed: boolean;
  onEdit?: (id: string) => void;
}) {
  const src = photoSrc(photo, THUMB);
  const busy = photo.status === "reading" || photo.status === "uploading";
  return (
    <li className="thumb" data-armed={armed || undefined} data-error={photo.status === "error" || undefined}>
      <button
        type="button"
        className="thumb__face"
        aria-pressed={armed}
        aria-label={`${photo.name}${uses > 0 ? `, in ${uses} ${uses === 1 ? "place" : "places"}` : ", not placed yet"}${
          photo.status === "error" ? ", upload failed" : busy ? ", uploading" : ""
        }`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, photo.id);
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => photos.arm(armed ? null : photo.id)}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob or one fixed Cloudinary size
          <img src={src} alt="" draggable={false} />
        ) : (
          <span className="thumb__none">{photo.status === "reading" ? "Reading…" : "No preview yet"}</span>
        )}
        {uses > 0 ? (
          <span className="thumb__uses" aria-hidden="true">
            ×{uses}
          </span>
        ) : null}
        {busy ? (
          <span className="thumb__bar" style={{ "--p": photo.progress } as CSSProperties} aria-hidden="true" />
        ) : null}
      </button>
      {onEdit && photo.px && photo.status !== "error" ? (
        <button type="button" className="thumb__edit" aria-label={`Edit ${photo.name}`} onClick={() => onEdit(photo.id)}>
          <Pencil size={17} />
        </button>
      ) : null}
      {photo.status === "error" ? (
        <button type="button" className="thumb__retry" onClick={() => photos.retry(photo.id)}>
          Retry
        </button>
      ) : null}
    </li>
  );
}
