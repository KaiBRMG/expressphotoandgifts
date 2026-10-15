/**
 * How each product is merchandised: its type, the occasions and people it
 * suits, and what the customer supplies to have it made. Keyed by the shop's
 * primary product code; read by import-catalog.mts.
 *
 * The spreadsheet carries none of this, so it lives here until the admin
 * section edits it in Firestore; then this table goes and the importer stops
 * writing these tags. Every value must be in the vocabulary in
 * lib/catalog/tags.ts, and every product must have an entry: the importer
 * fails on a gap rather than publishing an untyped product.
 *
 * Occasions and recipients are a first pass from each product's own
 * description, for the shop to confirm. Only tag what the shop would say out
 * loud at the counter; a filter that lists everything under every occasion
 * helps nobody.
 */
import type { PhotoShape } from "../lib/catalog/tags";
import type { Personalisation } from "../lib/catalog/types";

export type Merchandising = {
  type: string;
  occasions?: string[];
  for?: string[];
  /**
   * Physical pairings beyond what the Size option already gives: what this
   * goes into or onto (`fits`), and what goes into or onto it (`holds`). A
   * print fits a frame that holds its size; a frame fits an easel.
   */
  fits?: string[];
  holds?: string[];
  personalisation?: Personalisation;
};

const gift = (text: boolean): Personalisation => ({ kind: "gift", text });
const print = (text = false): Personalisation => ({ kind: "print", text });

/** Frames stand on either easel: both take up to A3, the largest standard frame. */
const EASEL = ["easel"];

const ROYAL: Merchandising = { type: "royal-frames", occasions: ["wedding", "anniversary", "matric", "memorial"], fits: EASEL };
const CLASSIC: Merchandising = { type: "classic-frames", occasions: ["matric", "new-home"], fits: EASEL };
const EARRINGS: Merchandising = { type: "earrings", occasions: ["birthday", "mothers-day"], for: ["her"] };
const NECKLACE: Merchandising = { type: "necklaces", occasions: ["birthday", "mothers-day"], for: ["her"] };
const ALBUM: Merchandising = { type: "albums", occasions: ["wedding", "new-baby"], holds: ["10x15"] };

export const MERCHANDISING: Record<string, Merchandising> = {
  // ─── Photo Gifts ────────────────────────────────────────────────────────
  SM1: { type: "mugs", occasions: ["birthday", "mothers-day", "fathers-day", "christmas"], personalisation: gift(true) },
  BM1: { type: "mugs", occasions: ["birthday", "fathers-day", "christmas"], for: ["him"], personalisation: gift(false) },
  RC1: { type: "kitchen", occasions: ["fathers-day", "new-home"], personalisation: gift(true) },
  PH1: { type: "kitchen", occasions: ["mothers-day", "new-home"], personalisation: gift(true) },
  CB1: { type: "kitchen", occasions: ["mothers-day", "wedding", "new-home"], personalisation: gift(true) },
  ST1: { type: "decor", occasions: ["mothers-day", "anniversary", "memorial"], fits: ["tile-10x10"], personalisation: gift(true) },
  KR1: { type: "decor", occasions: ["new-home"], personalisation: gift(true) },
  PG1: { type: "decor", occasions: ["birthday", "christmas"], personalisation: gift(true) },
  PK1: { type: "keyrings", occasions: ["birthday", "valentines", "fathers-day"], personalisation: gift(true) },
  SBK1: { type: "keyrings", occasions: ["birthday", "fathers-day"], for: ["him"], personalisation: gift(false) },
  SP1: { type: "puzzles", occasions: ["birthday", "christmas"], for: ["kids"], personalisation: gift(true) },
  // Party favours.
  GB1: { type: "bags", occasions: ["birthday"], for: ["kids"], personalisation: gift(true) },

  // ─── Frames & Display ───────────────────────────────────────────────────
  RG1: ROYAL,
  RS1: ROYAL,
  RSG1: ROYAL,
  BF1: CLASSIC,
  WF1: CLASSIC,
  SW1: CLASSIC,
  BRF1: CLASSIC,
  MB1: CLASSIC,
  // A4 only, which the sheet gives as a measurement rather than a Size option.
  BLF1: { ...CLASSIC, holds: ["20x30"] },
  GF1: { ...CLASSIC, holds: ["20x30"] },
  EA1: { type: "easels", occasions: ["wedding", "memorial"], holds: EASEL },
  EA2: { type: "easels", occasions: ["wedding", "memorial"], holds: EASEL },
  // "Made for 10×10cm ceramic tiles."
  TH1: { type: "easels", holds: ["tile-10x10"] },

  // ─── Photo Printing ─────────────────────────────────────────────────────
  // Sizes come from the Size option; PP1 has none, being 10×15cm only.
  PS1: { type: "prints", personalisation: print() },
  FP1: { type: "prints", occasions: ["mothers-day", "christmas"], personalisation: print() },
  PP1: { type: "prints", fits: ["10x15"], personalisation: print() },
  PC1: { type: "collages", occasions: ["birthday", "mothers-day", "anniversary", "matric"], personalisation: print() },
  PC2: { type: "collages", occasions: ["birthday", "mothers-day", "anniversary", "matric"], personalisation: print(true) },
  FS1: { type: "collages", occasions: ["birthday", "valentines", "anniversary"], personalisation: print() },
  ID1: { type: "id-photos", personalisation: print() },

  // ─── Jewellery ──────────────────────────────────────────────────────────
  HE1: { ...EARRINGS, occasions: ["birthday", "valentines", "mothers-day"] },
  SE1: EARRINGS,
  SS1: EARRINGS,
  TL1: EARRINGS,
  CP1: NECKLACE,
  OB1: NECKLACE,
  // "Promise rings, simple wedding bands."
  SR1: { type: "rings", occasions: ["valentines", "wedding", "anniversary"] },

  // ─── Add-ons & Supplies ─────────────────────────────────────────────────
  // Both hold standard 10×15cm prints.
  RA1: ALBUM,
  BA1: ALBUM,
  KA2: { type: "batteries" },
  KA24: { type: "batteries" },
  KA26: { type: "batteries" },
  KA3: { type: "batteries" },
  KA34: { type: "batteries" },
  KA36: { type: "batteries" },
  K9V: { type: "batteries" },
  K12V: { type: "batteries" },
  K25: { type: "batteries" },
  KC2: { type: "batteries" },
  BP1: { type: "snacks" },
};

/**
 * What each personalised product needs from the customer's photos, read off
 * the shop's own dimension drawings, product shots and descriptions; the
 * importer turns it into "photos:", "print:" and "shape:" tags and refuses a
 * personalised product without it.
 *
 * - `photos`: every count it takes; where it takes several, an option names
 *   the count ("2 photos").
 * - `print`: the area each photo is printed at, in cm, width first. Scoped to
 *   one option by its key where it differs: "a4=29.7x21". Prints get theirs
 *   from their Size option, so only their exceptions are listed.
 *
 * "Stated" is printed on the shop's drawing or in its description. "Est." is
 * worked out from the product's measurements and the shop's own photo of it,
 * for the shop to confirm before the upload step relies on it.
 */
export type PhotoSpecEntry = { photos: number[]; print: string[]; shape: PhotoShape };

export const PHOTO_SPECS: Record<string, PhotoSpecEntry> = {
  // ─── Photo Gifts ────────────────────────────────────────────────────────
  // 8 cm across, 10 cm tall. Stated by the shop: a photo goes on one side of
  // the mug, never round it, which is why two photos is the other choice.
  // Est.: each side 9 × 9 cm.
  SM1: { photos: [1, 2], print: ["9x9"], shape: "rect" },
  // 8 cm across, 15 cm tall, frosted. One photo a side, as the coffee mug.
  // Est.: each side 9 × 12 cm.
  BM1: { photos: [1, 2], print: ["9x12"], shape: "rect" },
  // Stated: 10 cm diameter, printed edge to edge.
  RC1: { photos: [1], print: ["10x10"], shape: "round" },
  // Stated: 18 × 18 cm print area.
  PH1: { photos: [1], print: ["18x18"], shape: "rect" },
  // Stated: 20 × 29 cm board, printed whole; the shop's shot is landscape.
  CB1: { photos: [1], print: ["29x20"], shape: "rect" },
  // Stated: each tile printed edge to edge.
  ST1: { photos: [1], print: ["10x10cm=10x10", "15x15cm=15x15", "20x15cm=20x15"], shape: "rect" },
  // Stated: 15 × 15 cm print area, on the included tile.
  KR1: { photos: [1], print: ["15x15"], shape: "rect" },
  // Stated: "Includes 2 photos". Est.: each fills the 7 × 6 cm arched insert
  // in an 8.2 cm globe, front and back.
  PG1: { photos: [2], print: ["7x6"], shape: "dome" },
  // Stated: 4.6 × 6.5 cm, printed edge to edge, portrait.
  PK1: { photos: [1], print: ["4.6x6.5"], shape: "rect" },
  // Stated: 2.4 cm diameter print area.
  SBK1: { photos: [1], print: ["2.4x2.4"], shape: "round" },
  // Stated: A4 29.7 × 21 cm and A5 21 × 14.8 cm, landscape, printed whole.
  SP1: { photos: [1], print: ["a4=29.7x21", "a5=21x14.8"], shape: "rect" },
  // 19.5 × 24.5 cm bag. Est.: 15 × 20 cm clear of the seams and drawstring;
  // the same photo on one side or both.
  GB1: { photos: [1], print: ["15x20"], shape: "rect" },

  // ─── Photo Printing ─────────────────────────────────────────────────────
  // A0 is not given in centimetres in the sheet: 84.1 × 118.9 cm.
  PS1: { photos: [1], print: ["a0=84.1x118.9"], shape: "rect" },
  FP1: { photos: [1], print: ["a0=84.1x118.9"], shape: "rect" },
  // Stated: full 10 × 15 cm; ½ prints 10 × 7.5 cm; ¼ prints 5 × 7.5 cm.
  PP1: { photos: [1, 2, 4], print: ["1-photo=10x15", "2-photos=10x7.5", "4-photos=5x7.5"], shape: "rect" },
  // Est.: the shop's sample is six photos on a portrait sheet; the print is
  // the whole sheet, which the shop lays out.
  PC1: { photos: [6], print: ["a5=14.8x21", "a4=21x29.7", "a3=29.7x42"], shape: "rect" },
  // Est.: the shop's sample is twelve photos and a line of writing on a
  // landscape sheet.
  PC2: { photos: [12], print: ["a5=21x14.8", "a4=29.7x21", "a3=42x29.7"], shape: "rect" },
  // Stated: 4 photos, each 3.5 × 3.5 cm, on a 5 × 15 cm strip.
  FS1: { photos: [4], print: ["3.5x3.5"], shape: "rect" },
  // Stated: 35 × 45 mm for most documents, six to a sheet from one photo.
  // (51 × 51 mm for the USA is on request; it is not an option yet.)
  ID1: { photos: [1], print: ["3.5x4.5"], shape: "rect" },
};
