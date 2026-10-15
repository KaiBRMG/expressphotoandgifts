import { useSyncExternalStore } from "react";

import type { CartLine } from "@/lib/catalog/cart";
import { editKey, isUntouched, type Edit, type Needs, type PhotoNeeds, type SlotNeed } from "@/lib/catalog/checkout";
import { photoCount } from "@/lib/catalog/listing";
import { shapeLine, type Bake, type LineState, type Photo, type Target } from "./photoStore";

/** A cart line as the photo step sees it: what it needs and what has been placed. */
export type Row = { line: CartLine; needs: Needs[string] | undefined; state: LineState };

export const rowsFor = (lines: CartLine[], needs: Needs, saved: Record<string, LineState>): Row[] =>
  lines.map((line) => {
    const n = needs[line.sku];
    return { line, needs: n, state: shapeLine(saved[line.sku], line.quantity, n?.photo?.slots.length ?? 0) };
  });

export const target = (row: Row, photo: PhotoNeeds, set: number, slot: number): Target => ({
  sku: row.line.sku,
  set,
  slot,
  need: photo.slots[slot],
  kind: photo.kind,
  quantity: row.line.quantity,
  slots: photo.slots.length,
});

/** Every slot on the order, in reading order. */
export function allTargets(rows: Row[]): Target[] {
  return rows.flatMap((row) => {
    const photo = row.needs?.photo;
    if (!photo) return [];
    return row.state.sets.flatMap((s, i) => s.map((_, j) => target(row, photo, i, j)));
  });
}

export const slotId = (t: { sku: string; set: number; slot: number }) => `slot-${t.sku}-${t.set}-${t.slot}`;

/**
 * What a filled place sends the shop: null when it is untouched and the
 * original goes, otherwise its render (undefined until one is started).
 */
export function renderOf(photo: Photo, need: SlotNeed, edit: Edit, bakes: Record<string, Bake>) {
  if (!photo.px || isUntouched(photo.px, need, edit)) return null;
  const key = editKey(photo.id, photo.px, need, edit);
  return { key, bake: bakes[key] as Bake | undefined };
}

export type Progress = {
  total: number;
  filled: number;
  /** Slots with nothing in them. */
  empty: Target[];
  /** Slots whose photo, or edited render, is still on its way to the shop, or failed to get there. */
  pending: Target[];
  failed: Target[];
  /** How many slots each photo is in. */
  uses: Map<string, number>;
};

export function progress(rows: Row[], photos: Photo[], bakes: Record<string, Bake>): Progress {
  const byId = new Map(photos.map((p) => [p.id, p]));
  const out: Progress = { total: 0, filled: 0, empty: [], pending: [], failed: [], uses: new Map() };
  for (const row of rows) {
    for (const t of allTargets([row])) {
      out.total++;
      const placed = row.state.sets[t.set][t.slot];
      const photo = placed ? byId.get(placed.photo) : undefined;
      if (!placed || !photo) {
        out.empty.push(t);
        continue;
      }
      out.filled++;
      out.uses.set(photo.id, (out.uses.get(photo.id) ?? 0) + 1);
      const render = renderOf(photo, t.need, placed.edit, bakes);
      if (photo.status === "error" || render?.bake?.status === "error") out.failed.push(t);
      else if (photo.status !== "done" || (render && render.bake?.status !== "done")) out.pending.push(t);
    }
  }
  return out;
}

/**
 * What still stands between the customer and sending the order, in the
 * order it should be dealt with; each names the first place it applies to.
 */
export function problems(prog: Progress): { text: string; t: Target }[] {
  const places = (n: number) => (n === 1 ? "1 place needs" : `${n} places need`);
  return [
    prog.empty.length > 0 && { text: `${places(prog.empty.length)} a photo`, t: prog.empty[0] },
    prog.failed.length > 0 && { text: `${photoCount(prog.failed.length)} didn’t upload`, t: prog.failed[0] },
    prog.pending.length > 0 && { text: "Photos still uploading…", t: prog.pending[0] },
  ].filter((p): p is { text: string; t: Target } => Boolean(p));
}

/** What a tray photo carries when it is dragged onto a slot. */
export const DRAG_TYPE = "application/x-epg-photo";

const noop = () => () => {};

/**
 * False on the server and in the first render, true once in the browser: the
 * cart and the photos live in this browser, so checkout draws nothing it
 * would have to take back.
 */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
