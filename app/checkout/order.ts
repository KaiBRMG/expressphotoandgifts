import type { LineInput, PlacedFile } from "@/lib/checkout/order";
import { renderOf, type Row } from "./model";
import type { Bake, Photo } from "./photoStore";

/**
 * The cart with its photos placed, as the order goes to the server: each
 * line, and under it every place's file in Cloudinary (`orders/<ref>`): the
 * original as uploaded, or for a place the customer edited, its edited
 * render. The server prices it; nothing here is trusted for money.
 */
export function orderLines(rows: Row[], photos: Photo[], bakes: Record<string, Bake>): LineInput[] {
  const byId = new Map(photos.map((p) => [p.id, p]));

  return rows.map(({ line, needs, state }) => {
    const out: LineInput = { sku: line.sku, quantity: line.quantity, sets: [], note: state.note ?? "" };
    if (needs?.frame) out.frame = { empty: Boolean(state.empty), quote: Boolean(state.quote) };

    const photo = needs?.photo;
    if (!photo) return out;
    out.sets = state.sets.map((set, i) => ({
      words: state.words[i]?.trim() ?? "",
      files: set.flatMap((placed, slot): PlacedFile[] => {
        const p = placed ? byId.get(placed.photo) : undefined;
        if (!placed || !p?.publicId || !p.version || !p.px) return [];
        const need = photo.slots[slot];
        const render = renderOf(p, need, placed.edit, bakes);
        const file = render ? render.bake : p;
        if (!file?.publicId || !file.version) return [];
        return [{ slot, label: need.label, publicId: file.publicId, version: file.version, edited: Boolean(render) }];
      }),
    }));
    return out;
  });
}
