/**
 * Packs a cart into the shop's boxes for the courier's price: each line's
 * size and weight, packed (`Product.shipping`, `lib/catalog/measures.ts`),
 * times its quantity, filled into as few parcels as hold them, each in the
 * smallest box that does.
 *
 * How many of one thing a box holds is counted, not guessed from volume: laid
 * out in rows, columns and layers inside the box less its padding, in the turn
 * that fits the most (six mugs don't fit a box with room for four, whatever
 * their volume). A box holds a mix when the shares of it each thing takes add
 * up to no more than the whole, and when it weighs no more than the courier
 * takes. That is how parcel software prices a cart without a full 3D packing:
 * exact for a line of one thing, close for a mix, and cheap.
 *
 * Something no box holds goes in its own packaging at its own size, padded.
 * Something not yet measured makes the cart go in the standard box at least,
 * as checkout quoted before products had sizes.
 *
 * Shared by the browser and the server. No secrets.
 */
import { BOX_IDS, boxVolume, DEFAULT_BOX, MAX_PARCEL_KG, OWN, sized, type Box, type Boxes, type SizedParcel } from "./boxes";
import type { Size } from "@/lib/catalog/measures";

/** Centimetres the inside of a box loses each way to its walls and padding: 1 cm all round. */
const PADDING_CM = 2;

/** The wrapping added to something sent in its own packaging, in kilograms. */
const OWN_WRAP_KG = 0.25;

/** One cart line as the packer reads it: its size and weight, packed, or null when not known; and how many. */
export type Item = { size: Size | null; quantity: number };

type Sides = [number, number, number];

/** One line's things, all the same; `fits` caches how many a box holds, by box. */
type Unit = { sides: Sides; volume: number; weight: number; count: number; fits: Map<Box, number> };

/** What a box holds so far: how many of each unit, and their weight. */
type Load = { parts: { unit: Unit; n: number }[]; weight: number };

const EMPTY: Load = { parts: [], weight: 0 };

/** Sides longest first. */
const sidesOf = (s: Pick<Size, "length" | "width" | "height">): Sides => [s.length, s.width, s.height].sort((a, b) => b - a) as Sides;
/** Up to 10 g, as the courier reads a weight. */
const kg = (n: number) => Math.ceil(n * 100 - 1e-9) / 100;

const TURNS: [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/** How many of a unit fit in a box on their own, in rows, columns and layers, turned to fit the most. */
function capacity(box: Box, u: Unit): number {
  const known = u.fits.get(box);
  if (known !== undefined) return known;
  const room = sidesOf(box).map((s) => s - PADDING_CM);
  let best = 0;
  for (const [a, b, c] of TURNS) {
    best = Math.max(best, Math.floor(room[0] / u.sides[a] + 1e-9) * Math.floor(room[1] / u.sides[b] + 1e-9) * Math.floor(room[2] / u.sides[c] + 1e-9));
  }
  u.fits.set(box, best);
  return best;
}

/** The share of a box a load takes: 1 is full. Infinite when something in it doesn't fit at all. */
const share = (box: Box, load: Load) => load.parts.reduce((sum, { unit, n }) => sum + n / capacity(box, unit), 0);

/** Whether a box holds a load. */
const holds = (box: Box, load: Load) => share(box, load) <= 1 + 1e-9 && kg(box.weight + load.weight) <= MAX_PARCEL_KG;

/** A load with `n` more of a unit. */
function add(load: Load, unit: Unit, n: number): Load {
  const parts = load.parts.some((p) => p.unit === unit) ? load.parts.map((p) => (p.unit === unit ? { unit, n: p.n + n } : p)) : [...load.parts, { unit, n }];
  return { parts, weight: load.weight + unit.weight * n };
}

/** How many of a unit, up to `left`, a box takes on top of its load: by the room left and the weight left. */
function most(box: Box, load: Load, u: Unit, left: number): number {
  const byRoom = Math.floor((1 - share(box, load)) * capacity(box, u) + 1e-9);
  const byWeight = u.weight > 0 ? Math.floor((MAX_PARCEL_KG - box.weight - load.weight) / u.weight + 1e-9) : left;
  let n = Math.max(0, Math.min(left, byRoom, byWeight));
  // Rounding to 10 g can tip the last one over the weight limit.
  while (n > 0 && !holds(box, add(load, u, n))) n--;
  return n;
}

/**
 * The parcels a cart packs into, fewest first and then smallest: first fit
 * decreasing into the largest box, with each line's units placed together
 * (so a hundred prints cost one step, not a hundred), each filled parcel then
 * shrunk to the smallest box that still holds it. Never empty: a cart of
 * nothing measured is one standard box.
 */
export function pack(items: Item[], boxes: Boxes): SizedParcel[] {
  const order = BOX_IDS.map((id) => boxes[id]).sort((a, b) => boxVolume(a) - boxVolume(b));
  const largest = order[order.length - 1];

  const units: Unit[] = [];
  let unmeasured = false;
  for (const { size, quantity } of items) {
    const count = Math.floor(quantity);
    if (count < 1) continue;
    if (!size) unmeasured = true;
    else units.push({ sides: sidesOf(size), volume: boxVolume(size), weight: size.weight, count, fits: new Map() });
  }
  // Biggest first: the big things decide the boxes, and the small ones fill round them.
  units.sort((a, b) => b.volume - a.volume || b.weight - a.weight);

  const own: SizedParcel[] = [];
  const loads: Load[] = [];
  for (const u of units) {
    if (!holds(largest, add(EMPTY, u, 1))) {
      // Too big or too heavy for any box: each goes on its own, padded.
      const [length, width, height] = u.sides.map((s) => s + PADDING_CM);
      for (let i = 0; i < u.count; i++) own.push(sized(boxes, { box: OWN, weight: kg(u.weight + OWN_WRAP_KG), length, width, height }));
      continue;
    }
    let left = u.count;
    for (let i = 0; i < loads.length && left > 0; i++) {
      const n = most(largest, loads[i], u, left);
      if (n > 0) {
        loads[i] = add(loads[i], u, n);
        left -= n;
      }
    }
    while (left > 0) {
      // An empty largest box takes at least one: checked above.
      const n = Math.max(1, most(largest, EMPTY, u, left));
      loads.push(add(EMPTY, u, n));
      left -= n;
    }
  }

  const parcels = loads.map((load) => ({ box: order.find((b) => holds(b, load)) ?? largest, load }));
  if (unmeasured) {
    // Room for what has no size yet: the last parcel, the least full, goes up to the standard box, or one is added.
    const floor = boxes[DEFAULT_BOX];
    const last = parcels.at(-1);
    if (!last) parcels.push({ box: floor, load: EMPTY });
    else if (boxVolume(last.box) < boxVolume(floor)) last.box = floor;
  }
  if (parcels.length === 0 && own.length === 0) parcels.push({ box: boxes[DEFAULT_BOX], load: EMPTY });

  return [...parcels.map(({ box, load }) => sized(boxes, { box: box.id, weight: kg(box.weight + load.weight) })), ...own];
}
