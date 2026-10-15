import type { CSSProperties } from "react";

import { cropBox, type Edit, type Pixels, type SlotNeed } from "@/lib/catalog/checkout";

const pct = (n: number) => `${n * 100}%`;

/**
 * The photo inside a box the size of the whole rotated photo: turned and toned
 * by the edit, sized in percentages so the box can be drawn at any scale.
 * Shared by a place's preview and the editor, so the two always agree.
 */
export function TurnedImg({ src, px, box, edit }: { src: string; px: Pixels; box: { W: number; H: number }; edit: Edit }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a local blob or a fixed Cloudinary size, never optimised
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        width: pct(px.w / box.W),
        height: pct(px.h / box.H),
        left: pct((box.W - px.w) / 2 / box.W),
        top: pct((box.H - px.h) / 2 / box.H),
        transform: edit.rotate ? `rotate(${edit.rotate}deg)` : undefined,
        filter: edit.grey ? "grayscale(1)" : undefined,
      }}
    />
  );
}

/**
 * A photo cut to its slot exactly as it will print: turned, cropped, zoomed
 * and toned by the customer's edit. Drawn with percentages, so it fills
 * whatever box holds it; the box sets the slot's proportions and outline.
 */
export function Cropped({ src, px, need, edit }: { src: string; px: Pixels; need: SlotNeed; edit: Edit }) {
  const b = cropBox(px, need, edit);
  const turn: CSSProperties = { left: pct(-b.x / b.w), top: pct(-b.y / b.h), width: pct(b.W / b.w), height: pct(b.H / b.h) };
  return (
    <span className="cropped" aria-hidden="true">
      <span className="cropped__turn" style={turn}>
        <TurnedImg src={src} px={px} box={b} edit={edit} />
      </span>
    </span>
  );
}
