/**
 * The photo step of checkout: what each line of the cart needs from the
 * customer's photos and where each photo is cut to fit. Shared by the server (which works out the needs from the
 * catalogue) and the browser (which does the rest), so it holds no secrets.
 */
import { toLine, type CartLine } from "./cart";
import { photoCount, primaryPhoto } from "./listing";
import { photoSpec } from "./photos";
import { cmLabel, parseArea, parseCm } from "./sizes";
import { tagValues, type PhotoShape } from "./tags";
import type { Product, ProductVariant } from "./types";

/** A cart line as the product page would add it, before the quantity is known. */
export type LineDraft = Omit<CartLine, "quantity">;

/** One place a photo goes: "Front", printed 9 × 9 cm, cut to a rectangle. */
export type SlotNeed = {
  label: string;
  /** Printed size in cm, width first; null when the shop has not said. */
  print: { w: number; h: number } | null;
  shape: PhotoShape;
};

export type PhotoNeeds = {
  kind: "gift" | "print";
  /** Their own words may go on it as well. */
  text: boolean;
  slots: SlotNeed[];
  /** A print the shop makes one of per photo, so N photos can become N prints. */
  perPhoto: boolean;
  /** The same product taking another number of photos (a mug's one side or two), to switch to in place. */
  layouts: { sku: string; label: string; photos: number; line: LineDraft }[];
};

export type FrameNeeds = {
  /** The print it holds, in cm, short side first. */
  size: { w: number; h: number };
  /** The print that fills it, at the lowest price on sale; null when none is on sale yet. */
  print: LineDraft | null;
};

/** The longest a customer's words on one item may be. */
export const WORDS_MAX = 80;

/** Keyed by SKU. A line with neither needs nothing from the customer. */
export type Needs = Record<string, { photo?: PhotoNeeds; frame?: FrameNeeds }>;

/** Sizes short side first, as `parseCm` reads them and "holds:"/"fits:" tags write them. */
const sizeKey = (s: { w: number; h: number }) => `${s.w}x${s.h}`;

/** "Front" and "Back" for a gift's two sides, "Photo 3" for a collage's third, "Your photo" for one. */
export function slotLabels(n: number, kind: "gift" | "print"): string[] {
  if (n === 1) return ["Your photo"];
  if (n === 2 && kind === "gift") return ["Front", "Back"];
  return Array.from({ length: n }, (_, i) => `Photo ${i + 1}`);
}

const draft = (p: Product, v: ProductVariant): LineDraft | null => {
  if (v.price === null) return null;
  const line: Partial<CartLine> = toLine(p, v, v.price, 1, p.slug, primaryPhoto(p));
  delete line.quantity;
  return line as LineDraft;
};

/** The size a frame variant holds, from its Size choice or, for a one-size frame, its "holds:" tag. */
function frameSize(p: Product, v: ProductVariant): { w: number; h: number } | null {
  const fromOption = Object.values(v.optionValues).map(parseCm).find(Boolean);
  if (fromOption) return fromOption;
  const held = tagValues(p.tags, "holds").flatMap((h) => parseArea(h) ?? []);
  return held.length === 1 ? held[0] : null;
}

/**
 * What every variant on sale needs at checkout, worked out on the server from
 * the catalogue and handed to the photo step and the cart drawer.
 */
export function buildNeeds(products: Product[]): Needs {
  const needs: Needs = {};

  // Every priced print by the size it comes out at, cheapest first, for frames to offer.
  const prints = new Map<string, { line: LineDraft; cents: number }>();
  for (const p of products) {
    if (!tagValues(p.tags, "type").includes("prints") || !p.personalisation) continue;
    for (const v of p.variants) {
      const size = Object.values(v.optionValues).map(parseCm).find(Boolean);
      const line = draft(p, v);
      if (!size || !line) continue;
      const have = prints.get(sizeKey(size));
      if (!have || line.price < have.cents) prints.set(sizeKey(size), { line, cents: line.price });
    }
  }

  for (const p of products) {
    for (const v of p.variants) {
      if (v.price === null) continue;
      const entry: Needs[string] = {};

      const spec = photoSpec(p, v);
      if (spec && p.personalisation) {
        const counts = tagValues(p.tags, "photos").map(Number);
        entry.photo = {
          kind: p.personalisation.kind,
          text: p.personalisation.text,
          slots: slotLabels(spec.photos, p.personalisation.kind).map((label) => ({ label, print: spec.print, shape: spec.shape })),
          perPhoto: tagValues(p.tags, "type").includes("prints") && spec.photos === 1,
          layouts:
            counts.length > 1
              ? p.variants.flatMap((o) => {
                  const line = draft(p, o);
                  const n = photoSpec(p, o)?.photos;
                  // Siblings differing from this variant in one choice only: the photo count.
                  const differ = Object.keys(v.optionValues).filter((k) => o.optionValues[k] !== v.optionValues[k]);
                  return line && n && differ.length <= 1 && (o === v || n !== spec.photos)
                    ? [{ sku: o.sku, label: photoCount(n), photos: n, line }]
                    : [];
                })
              : [],
        };
      }

      if (p.categoryId === "frames") {
        const size = frameSize(p, v);
        if (size) {
          const print = prints.get(sizeKey(size));
          entry.frame = { size, print: print?.line ?? null };
        }
      }

      if (entry.photo || entry.frame) needs[v.sku] = entry;
    }
  }
  return needs;
}

/* ---- Fitting a photo to a slot ----------------------------------------- */

export type Rotation = 0 | 90 | 180 | 270;

/**
 * How the customer set a photo in one slot. Kept as instructions beside the
 * untouched original, so the shop prints from the full file.
 */
export type Edit = {
  rotate: Rotation;
  /**
   * 1 fills the place with as much of the photo as fits; 2 shows half as
   * much. Below 1 the photo shrinks inside the place, down to the whole photo
   * showing, and white borders fill the rest.
   */
  zoom: number;
  /** Centre of the crop, as a fraction of the (rotated) photo's width and height. */
  x: number;
  y: number;
  grey: boolean;
  /** A print turned on its side, so a landscape photo prints landscape. */
  turned: boolean;
};

export const MAX_ZOOM = 5;


/** Untouched: the whole photo as it was taken, centred, nothing turned or toned. Zoom 0 is held to the whole photo. */
export const DEFAULT_EDIT: Edit = { rotate: 0, zoom: 0, x: 0.5, y: 0.5, grey: false, turned: false };

/** A photo's pixel size, upright (camera orientation already applied). */
export type Pixels = { w: number; h: number };

/** The print area as placed: width first, turned when the customer turned it. */
export const placedArea = (slot: SlotNeed, edit: Pick<Edit, "turned">) =>
  slot.print && edit.turned ? { w: slot.print.h, h: slot.print.w } : slot.print;

/** The photo's size after rotation. */
const rotated = (px: Pixels, r: Rotation): Pixels => (r % 180 === 0 ? px : { w: px.h, h: px.w });

/**
 * The part of the photo that is printed, in pixels of the rotated photo:
 * the largest box of the slot's shape that fits, shrunk by the zoom and held
 * inside the photo.
 */
export function cropBox(px: Pixels, slot: SlotNeed, edit: Edit) {
  const { w: W, h: H } = rotated(px, edit.rotate);
  const area = placedArea(slot, edit);
  const aspect = area ? area.w / area.h : W / H;
  const [bw, bh] = W / H > aspect ? [H * aspect, H] : [W, W / aspect];
  // The least zoom shows the whole photo: the box reaches both its edges on one side.
  const minZoom = Math.min(bw / W, bh / H);
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoom, edit.zoom));
  const w = bw / zoom;
  const h = bh / zoom;
  // Where the box is wider than the photo the photo sits centred, white either side.
  const cx = w >= W ? W / 2 : Math.min(W - w / 2, Math.max(w / 2, edit.x * W));
  const cy = h >= H ? H / 2 : Math.min(H - h / 2, Math.max(h / 2, edit.y * H));
  return {
    W,
    H,
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h,
    aspect,
    zoom,
    minZoom,
    /** The part of the photo cut away when it fills the place. */
    trimmed: 1 - (bw * bh) / (W * H),
    /** White borders show beside the photo. */
    bordered: w > W + 0.5 || h > H + 0.5,
  };
}

/** The edit held to what the photo allows, as `cropBox` sees it: zoom in range, centre inside. */
export function clampEdit(px: Pixels, slot: SlotNeed, edit: Edit): Edit {
  const b = cropBox(px, slot, edit);
  return { ...edit, zoom: b.zoom, x: (b.x + b.w / 2) / b.W, y: (b.y + b.h / 2) / b.H };
}

/** The edit zoomed out to show the whole photo, white borders round it. */
export const wholePhoto = (px: Pixels, slot: SlotNeed, edit: Edit): Edit => clampEdit(px, slot, { ...edit, zoom: 0 });

/**
 * A new placement: the whole photo, exactly as uploaded, never cropped on
 * the customer's behalf; most customers never edit, and what they took is
 * what they get. A print follows the photo's orientation, the way a lab
 * prints a landscape shot landscape; a gift's print area is fixed by the
 * object.
 */
export function freshEdit(px: Pixels, slot: SlotNeed, kind: "gift" | "print"): Edit {
  const area = slot.print;
  const turned =
    kind === "print" && slot.shape === "rect" && area !== null && area.w !== area.h && px.w > px.h !== area.w > area.h;
  return clampEdit(px, slot, { ...DEFAULT_EDIT, turned });
}

/**
 * True while the customer has changed nothing that alters the picture: the
 * whole photo shows, unturned and in colour. Such a place goes to the shop
 * as the original upload; any other is rendered and uploaded as edited.
 */
export function isUntouched(px: Pixels, slot: SlotNeed, edit: Edit): boolean {
  const b = cropBox(px, slot, edit);
  return edit.rotate === 0 && !edit.grey && b.zoom <= b.minZoom + 0.001;
}

/**
 * What an edited place looks like, as a key: the photo and the exact pixels
 * kept, turned and toned. Places that come out the same share one rendered
 * file.
 */
export function editKey(photoId: string, px: Pixels, slot: SlotNeed, edit: Edit): string {
  const b = cropBox(px, slot, edit);
  const r = (n: number) => Math.round(n);
  return `${photoId}|${edit.rotate}|${edit.grey ? 1 : 0}|${r(b.x)},${r(b.y)},${r(b.w)},${r(b.h)}`;
}

/** How a photo sits in its place: its crop, how much is trimmed away, and whether white borders show. */
export function fit(px: Pixels, slot: SlotNeed, edit: Edit) {
  const box = cropBox(px, slot, edit);
  return { box, trimmed: box.trimmed, bordered: box.bordered };
}

/** More than this much of a photo cut away at the first placement is worth saying. */
export const TRIM_NOTE = 0.15;

export const areaLabel = (slot: SlotNeed, edit?: Pick<Edit, "turned">) => {
  const a = edit ? placedArea(slot, edit) : slot.print;
  return a ? cmLabel(a) : null;
};

/* ---- A frame's print ---------------------------------------------------- */

/**
 * Where a frame stands with its print, for the cart drawer and the photo
 * step alike: its print is already in the cart, can be added, or is not on
 * sale online yet.
 */
export function framePrint(frame: FrameNeeds, skusInCart: ReadonlySet<string>): "in-cart" | "can-add" | "not-on-sale" {
  if (!frame.print) return "not-on-sale";
  return skusInCart.has(frame.print.sku) ? "in-cart" : "can-add";
}
