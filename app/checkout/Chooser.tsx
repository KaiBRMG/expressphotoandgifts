"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { areaLabel, freshEdit, placedArea } from "@/lib/catalog/checkout";
import { Close } from "@/app/site/icons";
import { Cropped } from "./Cropped";
import { THUMB } from "@/lib/checkout/photoUrls";
import { photoSrc } from "./images";
import { photos, type Target, type PhotoState } from "./photoStore";
import { AddPhotos } from "./Tray";

/**
 * Choosing a photo for one place: every photo in the tray, each shown already
 * cut to this place's shape, so the customer picks knowing how it will
 * come out. New photos added here go in
 * the tray too, and the first goes straight into the place.
 */
export function Chooser({ target, store, onClose }: { target: Target; store: PhotoState; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const size = areaLabel(target.need);
  const choose = (id: string) => {
    photos.place(id, [target]);
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="chooser-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 id="chooser-title" className="sheet__title">
            Choose a photo
            <span>
              {target.need.label}
              {size ? `, ${size}` : ""}
            </span>
          </h2>
          <button type="button" className="sheet__close" aria-label="Close" onClick={() => ref.current?.close()}>
            <Close size={22} />
          </button>
        </header>

        <div className="sheet__body">
          {store.photos.length > 0 ? (
            <ul className="choices">
              {store.photos.map((p) => {
                const src = photoSrc(p, THUMB);
                const edit = p.px ? freshEdit(p.px, target.need, target.kind) : null;
                const area = edit ? placedArea(target.need, edit) : target.need.print;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="choice"
                      onClick={() => choose(p.id)}
                      aria-label={p.name}
                    >
                      <span
                        className="choice__face"
                        data-shape={target.need.shape}
                        style={{ "--a": area ? area.w / area.h : 1 } as CSSProperties}
                      >
                        {src && p.px && edit ? <Cropped src={src} px={p.px} need={target.need} edit={edit} /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="sheet__hint">You haven&rsquo;t added any photos yet. Choose them from your phone or computer.</p>
          )}
        </div>

        <footer className="sheet__foot">
          <AddPhotos
            label={store.photos.length > 0 ? "Add more photos" : "Add photos"}
            onAdded={([first]) => first && choose(first)}
          />
        </footer>
      </div>
    </dialog>
  );
}
