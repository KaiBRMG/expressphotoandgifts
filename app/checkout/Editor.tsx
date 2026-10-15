"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

import {
  areaLabel,
  clampEdit,
  cropBox,
  fit,
  freshEdit,
  MAX_ZOOM,
  placedArea,
  qualityLine,
  type Edit,
  type Rotation,
  wholePhoto,
} from "@/lib/catalog/checkout";
import { Alert, Check, Close, Crop, Greyscale, Rotate, Turn, ZoomIn } from "@/app/site/icons";
import { TurnedImg } from "./Cropped";
import { photoSrc, WORKING } from "./images";
import { allTargets, type Row } from "./model";
import { photos, type Target, type PhotoState } from "./photoStore";

const SHAPE_NOTE = {
  round: "Printed as a circle, so the corners are cut away.",
  dome: "Fills the arched window, so the top corners are cut away.",
  rect: null,
} as const;

/** The place's frame on the stage: as large as fits with a margin, at the place's proportions. */
function frameOn(stage: { w: number; h: number }, aspect: number) {
  const pad = stage.w < 480 ? 20 : 40;
  const w = Math.max(1, Math.min(stage.w - pad * 2, (stage.h - pad * 2) * aspect));
  return { w, h: w / aspect };
}

/**
 * Setting one photo in one place: move it, zoom, turn it, take it to black
 * and white, and see straight away whether it still prints sharply. The
 * frame is the place's real shape and proportions; everything outside it is
 * what gets cut away. Nothing is saved until Done; Escape or the close mark
 * leaves the place as it was.
 *
 * Opened from the tray, it edits that photo: in the place it already fills,
 * set the same way everywhere else it is; or, not placed yet, previewed in
 * the place given, which it fills on Done.
 */
export function Editor({
  target,
  photoId,
  rows,
  store,
  onClose,
  onReplace,
}: {
  target: Target;
  /** A tray photo to edit, when the editor was opened from the tray. */
  photoId?: string;
  rows: Row[];
  store: PhotoState;
  onClose: () => void;
  onReplace: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  const row = rows.find((r) => r.line.sku === target.sku);
  const current = row?.state.sets[target.set]?.[target.slot] ?? null;
  const pid = photoId ?? current?.photo;
  // A tray photo not yet in this place is previewed here, and only placed on Done.
  const pending = Boolean(photoId && current?.photo !== photoId);
  const placed = pending ? null : current;
  const photo = pid ? store.photos.find((p) => p.id === pid) : undefined;
  const [draft, setEdit] = useState<Edit | null>(placed?.edit ?? null);
  const [everywhere, setEverywhere] = useState(Boolean(photoId));

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const px = photo?.px ?? null;
  const need = target.need;
  // A fresh placement until the customer changes it, worked out once the photo's size is known.
  const base = (e: Edit | null) => e ?? (px ? freshEdit(px, need, target.kind) : null);
  const edit = base(draft);

  const update = (fn: (e: Edit) => Edit) =>
    setEdit((d) => {
      const e = base(d);
      return e && px ? clampEdit(px, need, fn(e)) : e;
    });
  // `clampEdit` holds the zoom between the whole photo and the closest crop.
  const zoomTo = (zoom: number) => update((e) => ({ ...e, zoom }));
  const moveBy = (dx: number, dy: number) =>
    update((e) => {
      const b = cropBox(px!, need, e);
      const k = frameOn(stage, b.aspect).w / b.w;
      return { ...e, x: (b.x + b.w / 2 - dx / k) / b.W, y: (b.y + b.h / 2 - dy / k) / b.H };
    });

  // The wheel zooms; React's wheel listener is passive, so this one is attached by hand.
  const wheelZoom = useEffectEvent((dy: number) => update((cur) => ({ ...cur, zoom: cur.zoom * Math.exp(-dy * 0.0015) })));
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelZoom(e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; zoom: number } | null>(null);
  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onPointerDown = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && edit) pinch.current = { d: spread(), zoom: edit.zoom };
  };
  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) moveBy(e.clientX - prev.x, e.clientY - prev.y);
    else if (pinch.current) zoomTo((pinch.current.zoom * spread()) / pinch.current.d);
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 12;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[e.key]) moveBy(...moves[e.key]);
    else if (e.key === "+" || e.key === "=") zoomTo((edit?.zoom ?? 1) * 1.15);
    else if (e.key === "-") zoomTo((edit?.zoom ?? 1) / 1.15);
    else return;
    e.preventDefault();
  };

  // Other places holding this photo at the same shape and size, which can take the same setting.
  // Worked out once when the editor opens, not on every drag frame.
  const siblings = useMemo(() => {
    if (!pid) return [];
    const bySku = new Map(rows.map((r) => [r.line.sku, r]));
    return allTargets(rows).filter((t) => {
      if (t.sku === target.sku && t.set === target.set && t.slot === target.slot) return false;
      return (
        bySku.get(t.sku)?.state.sets[t.set]?.[t.slot]?.photo === pid &&
        t.need.shape === need.shape &&
        t.need.print?.w === need.print?.w &&
        t.need.print?.h === need.print?.h
      );
    });
  }, [rows, pid, target, need]);

  const close = () => ref.current?.close();
  const done = () => {
    if (!edit || !pid) return close();
    if (pending) photos.place(pid, [target]);
    photos.edit(everywhere ? [target, ...siblings] : [target], edit);
    close();
  };

  const size = edit ? areaLabel(need, edit) : areaLabel(need);
  const canTurn = target.kind === "print" && need.shape === "rect" && need.print !== null && need.print.w !== need.print.h;
  const box = px && edit ? cropBox(px, need, edit) : null;
  const whole = box ? box.zoom <= box.minZoom + 0.001 : false;

  let stageView = null;
  let verdict = null;
  if (px && edit && stage.w > 0) {
    const src = photoSrc(photo!, WORKING);
    const b = box!;
    const { w: fw, h: fh } = frameOn(stage, b.aspect);
    const k = fw / b.w;
    const fx = (stage.w - fw) / 2;
    const fy = (stage.h - fh) / 2;

    stageView = (
      <>
        {/* The paper: white wherever the photo does not reach, as it prints. */}
        <span
          className="editor__paper"
          data-shape={need.shape}
          style={{ left: fx, top: fy, width: fw, height: fh }}
          aria-hidden="true"
        />
        <span
          className="editor__photo"
          style={{ left: fx - b.x * k, top: fy - b.y * k, width: b.W * k, height: b.H * k }}
          aria-hidden="true"
        >
          {src ? <TurnedImg src={src} px={px} box={b} edit={edit} /> : null}
        </span>
        <span
          className="editor__frame"
          data-shape={need.shape}
          style={{ left: fx, top: fy, width: fw, height: fh }}
          aria-hidden="true"
        />
      </>
    );

    const f = fit(px, need, edit);
    const line = qualityLine(f.quality, size);
    verdict = (
      <p className="editor__verdict" data-quality={f.quality} aria-live="polite">
        {f.quality === "sharp" ? <Check size={20} /> : f.quality === "unknown" ? null : <Alert size={20} />}
        <span>
          {f.quality === "sharp"
            ? `Prints sharply${size ? ` at ${size}` : ""}.`
            : f.quality === "unknown"
              ? "The shop hasn’t given this item’s print size yet, so sharpness can’t be checked."
              : line}
          {f.dpi ? <span className="editor__dpi">{Math.round(f.dpi)} dpi</span> : null}
          {f.bordered ? <span className="editor__borders">The whole photo shows, with white borders filling the rest.</span> : null}
        </span>
      </p>
    );
  }

  return (
    <dialog ref={ref} className="editor" aria-labelledby="editor-title" onClose={onClose}>
      <div className="editor__panel">
        <header className="editor__head">
          <h2 id="editor-title" className="editor__title">
            {need.label}
            <span>
              {row?.line.name}
              {size ? ` · ${size}` : ""}
            </span>
          </h2>
          <button type="button" className="editor__close" aria-label="Close without saving" onClick={close}>
            <Close size={22} />
          </button>
        </header>

        <div
          ref={stageRef}
          className="editor__stage"
          tabIndex={0}
          role="application"
          aria-roledescription="Photo crop"
          aria-label="Drag to move the photo, pinch or scroll to zoom. Arrow keys move it; plus and minus zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {px ? stageView : <p className="editor__wait">Preparing your photo…</p>}
        </div>

        <div className="editor__controls">
          {verdict}
          {pending ? (
            <p className="editor__shape">
              Done puts this photo in {need.label} ({row?.line.name})
              {current ? ", replacing the photo there" : ""}.
            </p>
          ) : null}
          {SHAPE_NOTE[need.shape] ? <p className="editor__shape">{SHAPE_NOTE[need.shape]}</p> : null}

          {edit && px ? (
            <div className="editor__tools" role="group" aria-label="Edit">
              <label className="editor__zoom">
                <ZoomIn size={20} />
                <span className="visually-hidden">Zoom</span>
                <input
                  type="range"
                  min={box!.minZoom}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={box!.zoom}
                  onChange={(e) => zoomTo(Number(e.target.value))}
                  style={{ "--p": (box!.zoom - box!.minZoom) / (MAX_ZOOM - box!.minZoom) } as CSSProperties}
                />
              </label>
              {box!.minZoom < 0.999 ? (
                <button
                  type="button"
                  className="tool"
                  aria-pressed={whole}
                  onClick={() => update((e) => (whole ? { ...e, zoom: 1 } : wholePhoto(px, need, e)))}
                >
                  <Crop size={20} />
                  Whole photo
                </button>
              ) : null}
              <button
                type="button"
                className="tool"
                onClick={() => update((e) => ({ ...e, rotate: ((e.rotate + 90) % 360) as Rotation, x: 0.5, y: 0.5 }))}
              >
                <Rotate size={20} />
                Rotate
              </button>
              <button
                type="button"
                className="tool"
                aria-pressed={edit.grey}
                onClick={() => update((e) => ({ ...e, grey: !e.grey }))}
              >
                <Greyscale size={20} />
                Black and white
              </button>
              {canTurn ? (
                <button
                  type="button"
                  className="tool"
                  aria-pressed={edit.turned}
                  onClick={() => update((e) => ({ ...e, turned: !e.turned, zoom: 0, x: 0.5, y: 0.5 }))}
                >
                  <Turn size={20} />
                  {placedArea(need, { turned: true })!.w > placedArea(need, { turned: true })!.h
                    ? "Landscape print"
                    : "Portrait print"}
                </button>
              ) : null}
              <button type="button" className="tool tool--quiet" onClick={() => setEdit(freshEdit(px, need, target.kind))}>
                Start over
              </button>
            </div>
          ) : null}

          {siblings.length > 0 ? (
            <label className="check editor__all">
              <input type="checkbox" checked={everywhere} onChange={(e) => setEverywhere(e.target.checked)} />
              Set it the same way in the {siblings.length === 1 ? "other place" : `other ${siblings.length} places`} with
              this photo
            </label>
          ) : null}

          <div className="editor__foot">
            <button type="button" className="inline-link" onClick={onReplace}>
              Use another photo
            </button>
            {pending ? null : (
              <button
                type="button"
                className="inline-link"
                onClick={() => {
                  photos.clear(target);
                  close();
                }}
              >
                Empty this place
              </button>
            )}
            <button type="button" className="btn btn--gold on-gold editor__done" onClick={done}>
              <Check size={19} />
              Done
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
