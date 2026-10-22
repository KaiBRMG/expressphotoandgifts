/**
 * The boxes the shop ships in. Checkout packs the cart into them from each
 * product's size and weight (`lib/checkout/packing.ts`) and quotes the
 * courier for those parcels; staff confirm or change the boxes, their weights
 * and the number of parcels when they book the waybill.
 *
 * Shared by the browser (the editor, the admin's booking form) and the
 * server. No secrets.
 *
 * The three boxes are fixed, but each one's name, outside size and own weight
 * (empty, with its padding) is the shop's to set in the admin's Settings
 * (`settings/shop.boxes`, `lib/settings.ts`). Until it saves them, they are
 * DEFAULT_BOXES: PLACEHOLDERS, not measured. The Courier Guy bills the greater
 * of the real weight and the volumetric weight (it charged 3 kg for the
 * 35 × 25 × 12 cm box at 2 kg), and re-measures parcels at its hub, billing the
 * account for any difference.
 */

export const BOX_IDS = ["small", "medium", "large"] as const;
export type BoxId = (typeof BOX_IDS)[number];

/** A box as The Courier Guy reads a parcel: its outside in centimetres, and its own weight in kilograms, empty with its padding. */
export type Box = { id: BoxId; label: string; length: number; width: number; height: number; weight: number };

export type Boxes = Record<BoxId, Box>;

/** The boxes until Settings saves the shop's own. */
export const DEFAULT_BOXES: Boxes = {
  small: { id: "small", label: "Small", length: 25, width: 20, height: 8, weight: 0.15 },
  medium: { id: "medium", label: "Medium", length: 35, width: 25, height: 12, weight: 0.3 },
  large: { id: "large", label: "Large", length: 50, width: 40, height: 20, weight: 0.6 },
};

/** The box a cart is quoted in at least when something in it has no size or weight yet. */
export const DEFAULT_BOX: BoxId = "medium";

export const isBox = (x: unknown): x is BoxId => BOX_IDS.includes(x as BoxId);

/** A box's or parcel's volume, in cubic centimetres. */
export const boxVolume = (b: Pick<Box, "length" | "width" | "height">) => b.length * b.width * b.height;

/** "35 × 25 × 12 cm". */
export const boxSize = (b: Pick<Box, "length" | "width" | "height">) => `${b.length} × ${b.width} × ${b.height} cm`;

/** "Medium, 35 × 25 × 12 cm". */
export const boxLabel = (b: Box) => `${b.label}, ${boxSize(b)}`;

/** Something too big for the shop's boxes, sent in its own packaging at its own size. */
export const OWN = "own";
export const OWN_LABEL = "Own packaging";

/**
 * One parcel as staff choose it: one of the shop's boxes, or its own
 * packaging at the size staff give; and its packed weight as they weighed it.
 */
export type Parcel = { box: BoxId; weight: number } | ({ box: typeof OWN; weight: number } & Pick<Box, "length" | "width" | "height">);

/**
 * A parcel with its box's name and size as they were when it was priced or
 * booked, so a later change in Settings doesn't rewrite a booked waybill.
 */
export type SizedParcel = Parcel & Pick<Box, "label" | "length" | "width" | "height">;

/** The parcel in the box as Settings has it now; its own packaging keeps its own size. */
export function sized(boxes: Boxes, p: Parcel): SizedParcel {
  if (p.box === OWN) return { ...p, label: OWN_LABEL };
  const { label, length, width, height } = boxes[p.box];
  return { ...p, label, length, width, height };
}

/** An empty box of this kind: its size, at its own weight. */
export const parcelFor = (boxes: Boxes, box: BoxId): SizedParcel => sized(boxes, { box, weight: boxes[box].weight });

/** The parcels a waybill starts from: those checkout packed and quoted, or for an older order, the box it was quoted in. */
export const quotedParcels = (boxes: Boxes, service: { parcels?: SizedParcel[]; box?: BoxId }): SizedParcel[] =>
  service.parcels?.length ? service.parcels : [parcelFor(boxes, service.box ?? DEFAULT_BOX)];

/** "Medium box, 1.2 kg" or "Own packaging, 90 × 12 × 12 cm, 2 kg", for a parcel as booked (older ones have no label). */
export function parcelText(boxes: Boxes, p: SizedParcel | Parcel): string {
  if (p.box === OWN) return `${OWN_LABEL}, ${boxSize(p)}, ${p.weight} kg`;
  return `${"label" in p ? p.label : boxes[p.box].label} box, ${p.weight} kg`;
}

/** The heaviest a parcel can be entered as here; the courier's own limit is checked when booking. */
export const MAX_PARCEL_KG = 30;

/** The longest side a box can be entered with, in centimetres. */
export const MAX_BOX_CM = 200;

/** The longest a box's name can be. */
export const MAX_BOX_LABEL = 24;

/** The number, rounded to `places`, when it's above 0 and at most `max`; otherwise null. */
const measure = (x: unknown, max: number, places: number): number | null => {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n * 10 ** places) / 10 ** places : null;
};

/** A packed weight in kilograms, to 10 g, or null. */
const kg = (x: unknown) => measure(x, MAX_PARCEL_KG, 2);

/** Checks boxes staff entered, or says what's wrong with the first that isn't right. */
export function checkBoxes(x: unknown): { ok: true; boxes: Boxes } | { error: string } {
  const raw = (x ?? {}) as Partial<Record<BoxId, Partial<Box>>>;
  const boxes = {} as Boxes;
  for (const id of BOX_IDS) {
    const b = raw[id];
    const label = typeof b?.label === "string" ? b.label.trim() : "";
    if (!label) return { error: `Give the ${DEFAULT_BOXES[id].label.toLowerCase()} box a name.` };
    if (label.length > MAX_BOX_LABEL) return { error: `“${label}” is too long for a box’s name: ${MAX_BOX_LABEL} characters at most.` };
    const [length, width, height] = [b?.length, b?.width, b?.height].map((d) => measure(d, MAX_BOX_CM, 1));
    if (!length || !width || !height) return { error: `The ${label} box needs a length, width and height between 1 and ${MAX_BOX_CM} cm.` };
    const weight = kg(b?.weight);
    if (!weight) return { error: `The ${label} box needs its own weight, empty with its padding: above 0 and up to ${MAX_PARCEL_KG} kg.` };
    boxes[id] = { id, label, length, width, height, weight };
  }
  const labels = BOX_IDS.map((id) => boxes[id].label.toLowerCase());
  if (new Set(labels).size < labels.length) return { error: "Give each box its own name, so staff can tell them apart." };
  // Checkout packs into the smallest box that holds the goods, trying them in this order, so they must grow in it.
  for (let i = 1; i < BOX_IDS.length; i++) {
    const [a, b] = [boxes[BOX_IDS[i - 1]], boxes[BOX_IDS[i]]];
    if (boxVolume(b) < boxVolume(a)) return { error: `The ${b.label} box is smaller than the ${a.label} box. Keep them in order, smallest first: checkout packs a cart into the smallest box it fits.` };
  }
  return { ok: true, boxes };
}

/** The boxes as saved, or the placeholders until Settings has saved a set that checks out. */
export function readBoxes(x: unknown): Boxes {
  const checked = checkBoxes(x);
  return "ok" in checked ? checked.boxes : DEFAULT_BOXES;
}

/** At most this many parcels on one waybill. */
export const MAX_PARCELS = 10;

/**
 * Reads untrusted parcels into a booking's, or null. A box's size comes from
 * Settings, never from the browser; only its own packaging gives its size.
 */
export function readParcels(x: unknown): Parcel[] | null {
  if (!Array.isArray(x) || x.length === 0 || x.length > MAX_PARCELS) return null;
  const parcels = x.map((p): Parcel | null => {
    const q = p as Partial<Record<keyof SizedParcel, unknown>> | null;
    const weight = kg(q?.weight);
    if (!q || !weight) return null;
    if (isBox(q.box)) return { box: q.box, weight };
    if (q.box !== OWN) return null;
    const [length, width, height] = [q.length, q.width, q.height].map((d) => measure(d, MAX_BOX_CM, 1));
    return length && width && height ? { box: OWN, weight, length, width, height } : null;
  });
  return parcels.every(Boolean) ? (parcels as Parcel[]) : null;
}
