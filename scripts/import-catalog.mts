/**
 * Imports "Express Photo Website Catalogue.xlsx" into Firestore.
 *
 *   npm run import:catalog -- --dry-run   # writes catalog-preview.json only
 *   npm run import:catalog                # writes to Firestore
 *
 * Source rules (agreed with the shop):
 * - Prices come from the "Product Catalogue" sheet; descriptive text from the
 *   "Quick List" sheet, which merges each product with its dimension row.
 * - Products with no price are imported as drafts.
 * - Rows whose code ends in "a"/"ab" (and the album inside views) are
 *   dimension or extra images of another product, not products.
 * - ID1–3, FP1–3 and PP1/PP1a/PP1ab are merged into one product each, with
 *   the original codes kept as SKUs.
 *
 * The admin console (/admin) is now where the catalogue is edited, so this is
 * a seed: it refuses to write over a catalogue that already has products.
 * `-- --replace` overrides that and replaces the catalogue, discarding every
 * edit staff have made since (products no longer in the sheet are deleted).
 * The site caches the catalogue for up to an hour, so changes show within that.
 */
import { writeFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type {
  Category,
  MediaRole,
  Product,
  ProductMedia,
  ProductOption,
  ProductVariant,
} from "../lib/catalog/types";
import { photoSpec } from "../lib/catalog/photos.ts";
import { optionKey, parseCm } from "../lib/catalog/sizes.ts";
import { findTerm, isKnownFilterTag, tag, VOCABULARY } from "../lib/catalog/tags.ts";
import { MERCHANDISING, PHOTO_SPECS, type Merchandising } from "./catalog-merchandising.mts";

const WORKBOOK = "Express Photo Website Catalogue.xlsx";
const DRY_RUN = process.argv.includes("--dry-run");
const REPLACE = process.argv.includes("--replace");

/**
 * Five shelves, the photo gifts first because they are what the shop is for.
 * Finer groupings ("Mugs", "Easels and stands") are `type:` tags, not
 * sub-categories; see lib/catalog/tags.ts.
 */
const CATEGORIES: Category[] = [
  { id: "photo-gifts", name: "Photo Gifts", position: 0 },
  { id: "frames", name: "Frames & Display", position: 1 },
  { id: "photo-printing", name: "Photo Printing", position: 2 },
  { id: "jewellery", name: "Jewellery", position: 3 },
  { id: "add-ons", name: "Add-ons & Supplies", position: 4 },
];

/** The sheet's free-typed category column, normalised. */
const CATEGORY_ALIASES: Record<string, string> = {
  gift: "photo-gifts",
  gifts: "photo-gifts",
  frame: "frames",
  frames: "frames",
  photo: "photo-printing",
  photos: "photo-printing",
  jewellery: "jewellery",
  batteries: "add-ons",
};

const ALBUM_COLOURS: ProductOption = { name: "Colour", values: ["Navy", "Black", "Burgundy"] };

type Override = Partial<Pick<Product, "name" | "categoryId" | "careNotes" | "specifications">> & {
  /** Choices the sheet states in prose rather than as priced rows. */
  extraOptions?: ProductOption[];
  /** This row is an image of another product, beyond the "<code>a" convention. */
  imageOf?: string;
  /** Images in Cloudinary that the sheet does not list. */
  extraPhotos?: string[];
  /** Filed as a photo or sample but is really a sizing diagram. */
  diagram?: boolean;
  /** Fold other codes into this product as one option; values keyed by code, this code first. */
  merge?: { option: string; members: Record<string, string> };
};

/** Corrections to the spreadsheet, applied to every product the same way. */
const OVERRIDES: Record<string, Override> = {
  KA24: { categoryId: "add-ons" }, // typed as "c"
  PC1: { categoryId: "photo-printing" },
  PC2: { categoryId: "photo-printing" },
  BP1: { categoryId: "add-ons" },
  RA1: { categoryId: "add-ons", careNotes: "Hard cover album.", extraOptions: [ALBUM_COLOURS] },
  BA1: { categoryId: "add-ons", careNotes: "Hard cover album.", extraOptions: [ALBUM_COLOURS] },
  RA2: { imageOf: "RA1" },
  BA2: { imageOf: "BA1" },
  // Displays a tile; it does not take a photo of its own.
  TH1: { categoryId: "frames" },
  MB1: { extraOptions: [{ name: "Colour", values: ["Dark brown", "Black"] }] },
  FS1: { extraOptions: [{ name: "Filter", values: ["Colour", "Black & white", "Sepia"] }] },
  SP1: { extraPhotos: ["SP2"] },
  ID1: {
    name: "ID / Passport / Visa Photos",
    careNotes: "Black & white is mainly used for driver’s licence photos.",
    merge: { option: "Background", members: { ID1: "Colour", ID2: "Black & white", ID3: "Blue" } },
  },
  FP1: {
    name: "Family Photo Print",
    merge: { option: "Filter", members: { FP1: "Colour", FP2: "Black & white", FP3: "Sepia" } },
  },
  PP1: {
    name: "Photo Print 10 × 15cm",
    diagram: true,
    merge: {
      option: "Layout",
      members: { PP1: "1 photo, full size", PP1a: "2 photos (½ prints)", PP1ab: "4 photos (¼ prints)" },
    },
    specifications: [
      "Print size: 10×15cm",
      "½ prints: 2 photos, each 10×7.5cm",
      "¼ prints: 4 photos, each 5×7.5cm",
      "High-quality Kodak glossy photo paper/film only",
    ],
  },
};

// ─── Spreadsheet reading ──────────────────────────────────────────────────────

type Row = Record<string, string>;

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((r) => r.text).join("").trim();
  }
  return String(value).trim();
}

/** Reads a sheet into objects keyed by header, starting below the row whose first cell is `firstHeader`. */
function readSheet(sheet: ExcelJS.Worksheet, firstHeader: string): Row[] {
  let headers: string[] | null = null;
  const rows: Row[] = [];
  sheet.eachRow((row) => {
    const cells = (row.values as ExcelJS.CellValue[]).slice(1).map(cellText);
    if (!headers) {
      if (cells[0] === firstHeader) headers = cells;
      return;
    }
    if (cells.every((c) => !c)) return;
    rows.push(Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""])));
  });
  return rows;
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

/**
 * Print processes the sheet puts at the front of a product name. They are how
 * the shop makes it, not what the customer is buying, so they move to a tag:
 * "Sublimation Coffee Mug" → "Coffee Mug", tagged "sublimation".
 */
const PROCESS_PREFIXES = ["Sublimation"];

function splitProcess(name: string): { name: string; tags: string[] } {
  for (const prefix of PROCESS_PREFIXES) {
    if (name.startsWith(`${prefix} `)) {
      return { name: name.slice(prefix.length + 1), tags: [tag("process", prefix.toLowerCase())] };
    }
  }
  return { name, tags: [] };
}

/**
 * Types whose sizes are print sizes: a frame holds a print that size, a print
 * fits a frame that size. A 15×20 tile is neither, so other types get none.
 */
const PRINT_SIZE_FACET: Record<string, "holds" | "fits"> = {
  "royal-frames": "holds",
  "classic-frames": "holds",
  prints: "fits",
};

/**
 * The product's tags: its merchandising, the process taken from its name,
 * and, for frames and prints, one "holds:" or "fits:<w>x<h>" for every size
 * it comes in, so a frame and a print of one size find each other.
 */
function buildTags(code: string, m: Merchandising, options: ProductOption[], processTags: string[]): string[] {
  const spec = PHOTO_SPECS[code];
  const shown = [
    tag("type", m.type),
    ...(m.occasions ?? []).map((v) => tag("occasion", v)),
    ...(m.for ?? []).map((v) => tag("for", v)),
  ];
  for (const t of shown) if (!isKnownFilterTag(VOCABULARY, t)) throw new Error(`${code}: "${t}" is not in lib/catalog/tags.ts`);
  const sizeFacet = PRINT_SIZE_FACET[m.type];
  const sizes = sizeFacet
    ? (options.find((o) => o.name === "Size")?.values ?? []).flatMap((v) => {
        const cm = parseCm(v);
        return cm ? [tag(sizeFacet, `${cm.w}x${cm.h}`)] : [];
      })
    : [];
  return [
    ...new Set([
      ...shown,
      ...processTags,
      ...(m.fits ?? []).map((v) => tag("fits", v)),
      ...(m.holds ?? []).map((v) => tag("holds", v)),
      ...sizes,
      ...photoTags(spec, m.type, options),
    ]),
  ];
}

/**
 * "photos:", "print:" and "shape:" from catalog-merchandising.mts, plus for a
 * print one "print:<size>=<w>x<h>" per size it comes in.
 */
function photoTags(spec: (typeof PHOTO_SPECS)[string] | undefined, type: string, options: ProductOption[]): string[] {
  if (!spec) return [];
  const sizes =
    type === "prints"
      ? (options.find((o) => o.name === "Size")?.values ?? []).flatMap((v) => {
          const cm = parseCm(v);
          return cm ? [`${optionKey(v)}=${cm.w}x${cm.h}`] : [];
        })
      : [];
  return [
    ...spec.photos.map((n) => tag("photos", String(n))),
    ...[...sizes, ...spec.print].map((v) => tag("print", v)),
    tag("shape", spec.shape),
  ];
}

const isBlankPrice = (s: string) => !s || s === "—" || s === "-";
const rand = (n: string) => Math.round(Number(n) * 100);
const skuPart = (s: string) =>
  s
    .replace(/\s*\(.*\)$/, "") // "A4 (20 × 30 cm)" → "A4"
    .toUpperCase()
    .replace(/×/g, "X")
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 16);
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s*×\s*/g, "x")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const splitSpecs = (s: string) =>
  s
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1));
/** "A4 - 20 × 30 cm" → "A4 (20 × 30 cm)". */
const sizeLabel = (s: string) => s.replace(/^(A\d)\s*-\s*(.+)$/, "$1 ($2)");

type PricedChoice = { option: string | null; value: string | null; price: number | null };

/** Parses the Catalogue sheet's price cell, e.g. "R140 (1 photo) / R145 (2 photos)", "A4 R95 / A5 R55", "R65 each", 150. */
function parsePrice(raw: string): PricedChoice[] {
  if (isBlankPrice(raw)) return [{ option: null, value: null, price: null }];
  const single = raw.match(/^R?(\d+(?:\.\d+)?)(?: each)?$/);
  if (single) return [{ option: null, value: null, price: rand(single[1]) }];
  return raw.split(" / ").map((part) => {
    const after = part.match(/^R(\d+)\s*\((.+)\)$/); // R140 (1 photo)
    const before = part.match(/^(.+?)\s+R(\d+)$/); // A4 R95
    const [value, amount] = after ? [after[2], after[1]] : before ? [before[1], before[2]] : [];
    if (!value || !amount) throw new Error(`Unrecognised price "${raw}"`);
    const option = /photo/i.test(value) ? "Photos" : /side/i.test(value) ? "Print sides" : "Size";
    return { option, value, price: rand(amount) };
  });
}

/** Pulls "Available sizes: a, b, or c" out of a specifications list. */
function takeAvailableSizes(specs: string[]): { sizes: string[]; rest: string[] } {
  const i = specs.findIndex((s) => /^available sizes:/i.test(s));
  if (i === -1) return { sizes: [], rest: specs };
  const sizes = specs[i]
    .replace(/^available sizes:\s*/i, "")
    .replace(/\s+only$/i, "")
    .split(/,\s*(?:or\s+)?/)
    .map((s) => s.trim())
    .filter(Boolean);
  return { sizes, rest: specs.filter((_, j) => j !== i) };
}

/** Every combination of option values, in option order. */
function combinations(options: ProductOption[]): Record<string, string>[] {
  let combos: Record<string, string>[] = [{}];
  for (const o of options) {
    combos = combos.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v })));
  }
  return combos;
}

// ─── Build ────────────────────────────────────────────────────────────────────

/** `special` and `related` are the shop's to set, so the importer never writes them. */
type Draft = Omit<Product, "createdAt" | "updatedAt" | "special" | "related" | "box">;
type Asset = { width: number; height: number };
/** A coded catalogue row plus the uncoded extra-size rows below it. */
type Group = { row: Row; role: MediaRole; sizes: { measurements: string; price: string }[] };

async function listCloudinaryAssets(): Promise<Map<string, Asset>> {
  const { NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloud, NEXT_PUBLIC_CLOUDINARY_API_KEY: key, CLOUDINARY_API_SECRET: secret } =
    process.env;
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload?prefix=products/&max_results=500`,
    { headers: { Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64") } },
  );
  if (!res.ok) throw new Error(`Cloudinary listing failed: ${res.status}`);
  const { resources } = (await res.json()) as {
    resources: { public_id: string; width: number; height: number }[];
  };
  return new Map(resources.map((r) => [r.public_id, { width: r.width, height: r.height }]));
}

/** The options and prices one catalogue row offers, and the specifications left once sizes are taken out. */
function variantSource(group: Group, specs: string[]) {
  const { row, sizes } = group;
  if (sizes.length > 0) {
    // Extra-size rows: the coded row's first measurement is its own size.
    const [first, ...rest] = splitSpecs(row["Measurements"]);
    const priced = [{ measurements: first, price: row["Price"] }, ...sizes].map((s) => ({
      size: sizeLabel(s.measurements),
      price: isBlankPrice(s.price) ? null : rand(s.price),
    }));
    return {
      options: [{ name: "Size", values: priced.map((p) => p.size) }],
      priceOf: (v: Record<string, string>) => priced.find((p) => p.size === v["Size"])!.price,
      specs: rest,
    };
  }
  const choices = parsePrice(row["Price"]);
  const { sizes: listed, rest } = takeAvailableSizes(specs);
  const option = choices[0].option;
  if (option) {
    return {
      options: [{ name: option, values: choices.map((c) => c.value!) }],
      priceOf: (v: Record<string, string>) => choices.find((c) => c.value === v[option])!.price,
      specs: rest,
    };
  }
  return {
    options: listed.length ? [{ name: "Size", values: listed }] : [],
    priceOf: () => choices[0].price,
    specs: rest,
  };
}

async function build(): Promise<{ products: Draft[]; warnings: string[] }> {
  const workbook = new ExcelJS.Workbook();
  const [, assets] = await Promise.all([workbook.xlsx.readFile(WORKBOOK), listCloudinaryAssets()]);
  const catalogue = readSheet(workbook.getWorksheet("Product Catalogue")!, "Code");
  const quick = new Map(
    readSheet(workbook.getWorksheet("Quick List")!, "Actual Code")
      .filter((r) => r["Actual Code"])
      .map((r) => [r["Actual Code"], r]),
  );
  const warnings: string[] = [];

  const mergedInto = new Map<string, string>();
  for (const [code, o] of Object.entries(OVERRIDES)) {
    for (const member of Object.keys(o.merge?.members ?? {})) mergedInto.set(member, code);
  }

  const groups = new Map<string, Group>();
  const images = new Map<string, { code: string; role: MediaRole }[]>();
  let current: Group | null = null;
  for (const row of catalogue) {
    const code = row["Code"];
    if (!code) {
      current?.sizes.push({ measurements: row["Measurements"], price: row["Price"] });
      continue;
    }
    const role: MediaRole =
      row["Image Type"] === "Dimension Image" || OVERRIDES[code]?.diagram ? "dimension" : "photo";
    const parent = mergedInto.has(code)
      ? null
      : (OVERRIDES[code]?.imageOf ?? (role === "dimension" ? code.replace(/a+b?$/, "") : null));
    current = null;
    if (parent) {
      images.set(parent, [...(images.get(parent) ?? []), { code, role }]);
      continue;
    }
    current = { row, role, sizes: [] };
    groups.set(code, current);
  }

  const products: Draft[] = [];
  for (const [code, group] of groups) {
    const primary = mergedInto.get(code) ?? code;
    if (primary !== code && !groups.has(primary)) throw new Error(`${code}: merge target ${primary} missing`);
    if (primary !== code) continue; // built with its primary

    const o = OVERRIDES[code] ?? {};
    const merch = MERCHANDISING[code];
    if (!merch) throw new Error(`${code}: no entry in catalog-merchandising.mts`);
    const text = quick.get(code);
    if (!text) warnings.push(`${code}: not in Quick List, using Catalogue text`);
    const field = (c: string, key: string) => quick.get(c)?.[key] || groups.get(c)!.row[key];

    const { name, tags: processTags } = splitProcess(o.name ?? field(code, "Product Name"));
    const categoryId = o.categoryId ?? CATEGORY_ALIASES[group.row["categorie"].toLowerCase()];
    if (!categoryId) throw new Error(`${code}: unknown category "${group.row["categorie"]}"`);
    const typeCategory = findTerm(VOCABULARY, "type", merch.type)?.category;
    if (typeCategory !== categoryId) throw new Error(`${code}: type "${merch.type}" belongs to ${typeCategory}, not ${categoryId}`);

    const members = o.merge ? Object.keys(o.merge.members) : [code];
    const sources = members.map((c) => ({
      code: c,
      ...variantSource(groups.get(c)!, splitSpecs(field(c, "Measurements"))),
    }));
    const extra = o.extraOptions ?? [];
    const options: ProductOption[] = [
      ...(o.merge ? [{ name: o.merge.option, values: Object.values(o.merge.members) }] : []),
      ...sources[0].options,
      ...extra,
    ];
    const variants: ProductVariant[] = sources.flatMap((s) =>
      combinations([...s.options, ...extra]).map((values) => {
        const optionValues = o.merge ? { [o.merge.option]: o.merge.members[s.code], ...values } : values;
        return {
          sku: [s.code, ...Object.values(values).map(skuPart)].join("-"),
          title: Object.values(optionValues).join(" / ") || "Default",
          optionValues,
          price: s.priceOf(values),
        };
      }),
    );

    const media = members.flatMap((c): ProductMedia[] =>
      [
        { code: c, role: groups.get(c)!.role },
        ...(OVERRIDES[c]?.extraPhotos ?? []).map((p) => ({ code: p, role: "photo" as MediaRole })),
        ...(images.get(c) ?? []),
      ].flatMap(({ code: img, role }) => {
        const asset = assets.get(`products/${img}`);
        if (!asset) {
          warnings.push(`${code}: no Cloudinary image products/${img}`);
          return [];
        }
        return [{ publicId: `products/${img}`, role, alt: role === "dimension" ? `${name} dimensions` : name, ...asset }];
      }),
    );

    const prices = variants.map((v) => v.price).filter((x): x is number => x !== null);
    products.push({
      slug: slugify(name),
      code,
      name,
      categoryId,
      status: prices.length ? "active" : "draft",
      description: field(code, "Short Website Description"),
      specifications: o.specifications ?? sources[0].specs,
      careNotes: o.careNotes ?? (field(code, "Notes / Care") || null),
      personalisation: merch.personalisation ?? null,
      tags: buildTags(code, merch, options, processTags),
      currency: "ZAR",
      options,
      variants,
      priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
      // Photos first; dimension diagrams belong at the end, on the product page only.
      media: media.sort((a, b) => Number(a.role === "dimension") - Number(b.role === "dimension")),
    });
  }

  const seen = new Set<string>();
  for (const sku of products.flatMap((p) => p.variants.map((v) => v.sku))) {
    if (seen.has(sku)) throw new Error(`Duplicate SKU ${sku}`);
    seen.add(sku);
  }
  if (new Set(products.map((p) => p.slug)).size !== products.length) throw new Error("Duplicate product slugs");
  // A personalised product must say, for every choice, how many photos it
  // takes and the area each is printed at; nothing else may say so.
  for (const p of products) {
    if (Boolean(p.personalisation) !== Boolean(PHOTO_SPECS[p.code])) {
      throw new Error(`${p.code}: personalised products, and only those, need a PHOTO_SPECS entry`);
    }
    if (!p.personalisation) continue;
    for (const v of p.variants) {
      if (!photoSpec(p, v)?.print) throw new Error(`${p.code}: no print area for "${v.title}"`);
    }
    const keys = p.variants.flatMap((v) => Object.values(v.optionValues).map(optionKey));
    for (const t of PHOTO_SPECS[p.code].print) {
      const when = t.split("=")[1] === undefined ? null : t.split("=")[0];
      if (when && !keys.some((k) => k.startsWith(when))) throw new Error(`${p.code}: "print:${t}" matches no option`);
    }
  }
  const built = new Set(products.map((p) => p.code));
  for (const code of Object.keys(MERCHANDISING)) {
    if (!built.has(code)) warnings.push(`${code}: in catalog-merchandising.mts but not a product`);
  }

  return { products, warnings };
}

// ─── Write ────────────────────────────────────────────────────────────────────

async function write(products: Draft[]) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  initializeApp({ credential: cert(JSON.parse(key)) });
  const db = getFirestore();

  const [existing, oldCategories] = await Promise.all([
    db.collection("products").select().get(),
    db.collection("categories").select().get(),
  ]);
  if (existing.size > 0 && !REPLACE) {
    throw new Error(
      `Firestore already holds ${existing.size} products, edited in the admin since. ` +
        "Importing would overwrite those edits. Run with -- --replace only if that is what you want.",
    );
  }
  const existingIds = new Set(existing.docs.map((d) => d.id));
  const keep = new Set(products.map((p) => p.slug));
  const keepCategories = new Set(CATEGORIES.map((c) => c.id));

  const batch = db.batch();
  for (const c of CATEGORIES) batch.set(db.collection("categories").doc(c.id), c);
  for (const doc of oldCategories.docs) if (!keepCategories.has(doc.id)) batch.delete(doc.ref);
  for (const p of products) {
    batch.set(
      db.collection("products").doc(p.slug),
      {
        ...p,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existingIds.has(p.slug) ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
  }
  const removed = [...existingIds].filter((id) => !keep.has(id));
  for (const id of removed) batch.delete(db.collection("products").doc(id));
  await batch.commit();
  console.log(`Wrote ${CATEGORIES.length} categories and ${products.length} products; removed ${removed.length}.`);
}

const { products, warnings } = await build();
for (const w of warnings) console.warn("warning:", w);
const active = products.filter((p) => p.status === "active").length;
console.log(
  `${products.length} products (${active} active, ${products.length - active} draft), ` +
    `${products.reduce((n, p) => n + p.variants.length, 0)} variants.`,
);
if (DRY_RUN) {
  writeFileSync("catalog-preview.json", JSON.stringify({ categories: CATEGORIES, products }, null, 2));
  console.log("Dry run: wrote catalog-preview.json, nothing sent to Firestore.");
} else {
  await write(products);
}
