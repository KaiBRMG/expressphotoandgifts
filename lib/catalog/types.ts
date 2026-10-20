/**
 * Firestore catalogue schema.
 *
 * Follows the product → option → variant model used by Shopify, commercetools
 * and Google Merchant: a product is what the customer browses, its options are
 * the choices they make (Size, Colour…), and each variant is one purchasable
 * combination of those choices with its own SKU and price.
 *
 *   categories/{categoryId}   Category
 *   products/{slug}           Product (variants and media embedded — a product
 *                             has at most a few dozen, and the product page
 *                             then costs a single document read)
 *
 * Money is stored as integer minor units (cents) to avoid floating-point
 * rounding; all prices are in ZAR as listed in the shop, VAT inclusive.
 */

export type Currency = "ZAR";

export type ProductStatus =
  /** Live in the shop and purchasable. */
  | "active"
  /** Imported but not shown: no confirmed price yet, or still being edited. */
  | "draft"
  /** Withdrawn from sale; kept so old orders can still reference it. */
  | "archived";

export type Category = {
  /** Also the document ID and the URL segment under /shop. */
  id: string;
  name: string;
  /** Display order in navigation, ascending. */
  position: number;
};

export type ProductOption = {
  /** e.g. "Size", "Colour", "Photos". */
  name: string;
  /** Values in display order. */
  values: string[];
};

export type ProductVariant = {
  /** Unique across the catalogue; the shop's code, suffixed when a product has several variants. */
  sku: string;
  /** Human-readable label, e.g. "A4 (20 × 30 cm) / Navy", or "Default" for single-variant products. */
  title: string;
  /** One entry per product option, keyed by option name. Empty for single-variant products. */
  optionValues: Record<string, string>;
  /** Price in cents, or null when the shop has not confirmed one — such a variant cannot be bought. */
  price: number | null;
};

export type MediaRole =
  /** A photograph of the product or a print sample; shown in listings and the gallery. */
  | "photo"
  /** A sizing/dimension diagram; shown only on the detailed product page. */
  | "dimension";

/**
 * The two ways a customer's own photo becomes a product, after which the
 * upload step is shaped:
 * - "gift": printed onto an object (a mug, a puzzle); a photo, maybe words.
 * - "print": printed as a photograph or a layout of them (prints, collages,
 *   ID photos); size and filter are its options.
 */
export type PersonalisationKind = "gift" | "print";

export type Personalisation = {
  kind: PersonalisationKind;
  /** Their own words may go on it as well: a name, a date, a message. */
  text: boolean;
};

export type ProductMedia = {
  /** Cloudinary public ID, e.g. "products/BM1". */
  publicId: string;
  role: MediaRole;
  alt: string;
  width: number;
  height: number;
};

export type Product = {
  /** Also the document ID and the URL segment under /shop/product. */
  slug: string;
  /** The shop's primary product code (e.g. "BM1"). */
  code: string;
  name: string;
  categoryId: string;
  status: ProductStatus;
  description: string;
  /** Measurements and materials, one fact per entry. */
  specifications: string[];
  careNotes: string | null;
  /**
   * What the customer supplies to have it made, which decides how the product
   * page takes the order. Null for standard retail: nothing from the customer.
   */
  personalisation: Personalisation | null;
  /**
   * "facet:value" labels from the vocabulary in `tags.ts`: what it is
   * ("type:mugs"), what it is for ("occasion:birthday", "for:kids"), how it is
   * made ("process:sublimation"), what it goes with ("fits:20x30"), and for a
   * personalised product, how many photos it takes ("photos:2"), the area each
   * is printed at ("print:18x18") and the outline they are cropped to
   * ("shape:round").
   */
  tags: string[];
  /**
   * Shown under Specials. Set by the shop (the admin section, when it exists),
   * never by the importer, which merges and so leaves it as the shop set it.
   * The discount or bundle behind a special is a later pass.
   */
  special: boolean;
  /**
   * Hand-picked for its "Goes with this" row, by slug, in the order shown:
   * staff choose them in the admin, and the importer never writes them.
   * Products matched by size ("fits:"/"holds:") fill the row after these.
   */
  related: string[];
  currency: Currency;
  options: ProductOption[];
  variants: ProductVariant[];
  /** Lowest and highest priced variant, denormalised for listings and sorting; null when nothing is priced. */
  priceRange: { min: number; max: number } | null;
  /** Ordered; the first "photo" is the primary image. */
  media: ProductMedia[];
  /** Web addresses it was known by before staff changed it; each redirects here. */
  formerSlugs?: string[];
  /** ISO 8601. Stored in Firestore as Timestamps; converted on read so the result can be cached. */
  createdAt: string;
  updatedAt: string;
};
