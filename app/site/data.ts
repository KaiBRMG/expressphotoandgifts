/**
 * Everything the homepage states as fact lives here.
 *
 * Rule for this file: nothing goes in that has not been verified against a real
 * asset or supplied by the shop. No prices, no review counts, no turnaround
 * promises, no capability claims. The catalogue and its prices arrive later.
 *
 * Every image below has been opened and confirmed to be a product photograph.
 * `public/products` also contains spec/dimension diagrams (every `*a.png`, plus
 * `PP1.png`); those belong on product detail pages, never here.
 */

export type Print = {
  /** File in /public/products, without extension. All are square. */
  src: string;
  /** The product, named plainly. Doubles as the album caption. */
  label: string;
  /** Written for a screen reader that cannot see the photograph. */
  alt: string;
  /** One plain line describing what is in the photograph. Never a claim. */
  blurb?: string;
};

/** Real photographs of people, used where the page shows a customer's own picture. */
export const CUSTOMER_PHOTOS: Print[] = [
  {
    src: "FP1",
    label: "Family portrait",
    alt: "A mother, father and baby lying on a white studio floor, all laughing at the camera",
  },
  {
    src: "FP2",
    label: "Studio portrait",
    alt: "The same family photographed in black and white, the baby crawling towards the camera",
  },
  {
    src: "FP3",
    label: "Studio portrait",
    alt: "The same family portrait again, printed in warm sepia",
  },
];

export const GIFTS: Print[] = [
  {
    src: "SP1",
    label: "Photo puzzle",
    alt: "A photo jigsaw of a spaniel at sunset",
    blurb:
      "Your picture cut into a jigsaw, with a name and a date across the corner.",
  },
  {
    src: "ST1",
    label: "Photo tile and easel",
    alt: "A photo tile of six children, on a wooden easel",
    blurb:
      "A glossy tile on a small wooden easel, for a desk or a shelf.",
  },
  {
    src: "CB1",
    label: "Glass cutting board",
    alt: "A printed glass cutting board",
    blurb:
      "Toughened glass, printed edge to edge — names, dates, whatever you like.",
  },
  {
    src: "PK1",
    label: "Photo keyring",
    alt: "A printed photo keyring",
    blurb:
      "A small hard-wearing keyring with your picture on both sides.",
  },
  {
    src: "GB1",
    label: "Cotton gift bag",
    alt: "A drawstring cotton bag printed with a couple's photo inside a ring of red flowers",
  },
  {
    src: "PH1",
    label: "Pot holder",
    alt: "A linen pot holder printed with a frying pan and the words Mom you are flippin' awesome",
  },
  {
    src: "PG1",
    label: "Photo snow globe",
    alt: "Two photo snow globes",
    blurb:
      "Your photo sealed inside, on a clear weighted base.",
  },
  {
    src: "PC1",
    label: "Collage print",
    alt: "A collage of six family photographs on one mount",
    blurb:
      "Several photos laid out together on one dark wooden mount.",
  },
  {
    src: "SM1",
    label: "Photo mug",
    alt: "A white ceramic mug printed with a family photograph and a yellow gerbera",
    blurb:
      "Glossy white ceramic, printed right round — one photo or two.",
  },
  {
    src: "SBK1",
    label: "Bottle opener keyring",
    alt: "A metal bottle opener keyring with a round blue printed disc at the top",
    blurb:
      "A metal keyring and opener with a round printed disc on the face.",
  },
];

export const FRAMES: Print[] = [
  {
    src: "GF1",
    label: "Gold frame, A4",
    alt: "A slim gold A4 photo frame",
    blurb:
      "A slim gold moulding in A4, ready to take a print.",
  },
  {
    src: "WF1",
    label: "White frame, A4",
    alt: "A white A4 photo frame standing upright, holding a printed sample page",
  },
  {
    src: "MB1",
    label: "Dark wood frame",
    alt: "A dark stained wooden photo frame with an empty white mount",
  },
  {
    src: "SW1",
    label: "Distressed grey frame",
    alt: "A wide frame in distressed pale grey timber with an empty aperture",
  },
  {
    src: "BA1",
    label: "Photo album, black",
    alt: "A black leatherette photo album",
    blurb:
      "Black leatherette with a gold rule, for prints you want kept together.",
  },
  {
    src: "RA1",
    label: "Photo album, red",
    alt: "A deep red leatherette photo album with a gold rule around the cover",
  },
  {
    src: "EA1",
    label: "Wooden easel",
    alt: "A pale wooden display easel standing open",
  },
  {
    src: "PC1",
    label: "Collage mount",
    alt: "A dark wooden collage mount holding six family photographs",
  },
];

export const COUNTER: Print[] = [
  {
    src: "ID1",
    label: "ID and passport photos",
    alt: "A cut sheet of six identical passport photographs of a man in a dark collared shirt",
  },
  {
    src: "TH1",
    label: "Ceramic coasters",
    alt: "A stack of plain white ceramic coasters in a dark wooden holder",
  },
  {
    src: "TL1",
    label: "Tree of life earrings",
    alt: "A pair of silver drop earrings, each a round tree-of-life medallion",
  },
  {
    src: "SE1",
    label: "Spiral hoop earrings",
    alt: "A pair of polished silver spiral hoop earrings on a clear backing card",
  },
  {
    src: "HE1",
    label: "Heart drop earrings",
    alt: "A pair of gold-toned earrings, each with two small hearts on fine chains",
  },
  {
    src: "SR1",
    label: "Silver bangle",
    alt: "A plain polished silver bangle photographed on its side",
  },
  {
    src: "OB1",
    label: "Beaded silver chain",
    alt: "A fine silver chain set with small oval beads at intervals",
  },
  {
    src: "KA2",
    label: "Kodak AA batteries",
    alt: "A yellow Kodak Xtralife alkaline blister pack holding two AA batteries",
  },
];

/**
 * The prints mounted across the cover. Ordered so colour carries the rhythm.
 * Deliberately shares no image with the slot: the same photograph cannot be
 * both the visitor's own and one of the shop's samples in a single viewport.
 */
export const COVER_PRINTS: Print[] = [
  GIFTS[0], // photo puzzle
  FRAMES[0], // gold frame
  GIFTS[2], // cutting board
  GIFTS[3], // photo keyring
  GIFTS[1], // photo tile
  FRAMES[4], // black album
  GIFTS[4], // gift bag
  FRAMES[3], // distressed frame
  GIFTS[6], // snow globe
  COUNTER[0], // ID photos
  GIFTS[5], // pot holder
  FRAMES[1], // white frame
];

export type Category = {
  name: string;
  /**
   * The category's own page under `/shop`. Matches the Firestore category ID
   * where there is one; a tile with no live products lands on that page's
   * honest empty state rather than a 404.
   */
  slug: string;
  /**
   * The one card drawn in brand blue at rest. Specials is the shelf that
   * changes, so it is the one worth a second look; one blue card in seven is
   * an accent, two would be a pattern. It is also the one tile two columns
   * wide, so seven tiles close both grids without a gap.
   */
  feature?: boolean;
};

/** In the order the client listed them: what the shop is, then what it also stocks. */
export const CATEGORIES: Category[] = [
  { name: "Photo Printing", slug: "photo-printing" },
  { name: "Frames & Display", slug: "frames" },
  { name: "Photo Gifts", slug: "photo-gifts" },
  { name: "Add-ons & Supplies", slug: "add-ons" },
  { name: "Jewellery", slug: "jewellery" },
  { name: "Gift Wrapping", slug: "gift-wrapping" },
  { name: "Specials", slug: "specials", feature: true },
];

export const SHOP = {
  name: "Express Photo and Gifts",
  /** The public address, which canonical links, the sitemap, robots and structured data all give: not SITE_URL, which is unset or a preview host on some builds. */
  url: "https://expressphotoandgifts.com",
  street: "135 Scott Street",
  town: "Scottburgh",
  region: "Ugu District Municipality, KwaZulu-Natal",
  province: "KwaZulu-Natal",
  postcode: "4180",
  country: "South Africa",
  /** The number and email below are only what the shop starts with: Settings changes them, and the site reads them through `lib/contact.ts`. */
  phoneDisplay: "076 491 2300",
  /** International form, for tel: and wa.me links. */
  phoneE164: "27764912300",
  email: "info@expressphotoandgifts.com",
  instagram: "expressphotoscottburgh",
  instagramUrl: "https://www.instagram.com/expressphotoscottburgh/",
  facebook: "ExpressPhoto Scottburgh",
  facebookUrl: "https://www.facebook.com/p/Express-Photo-Scottburgh-61555865505542/",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=135+Scott+Street+Scottburgh+KwaZulu-Natal+4180",
} as const;

/**
 * The business behind the shop, as the law asks a shop selling online to
 * state it (ECTA s43) and a privacy policy to name who answers for it
 * (POPIA's Information Officer). NOT YET SUPPLIED BY THE SHOP: each null shows
 * on `/terms` and `/privacy` as a marked gap naming what is missing, never as
 * a guess. Fill them in from the shop's CIPC and SARS records.
 */
export const LEGAL: {
  /** The registered name, e.g. "Express Photo and Gifts (Pty) Ltd", or the owner's name for a sole proprietor. */
  registeredName: string | null;
  /** "Private company", "Close corporation", "Sole proprietor"… */
  legalForm: string | null;
  /** CIPC registration number; none for a sole proprietor. */
  registrationNumber: string | null;
  /** Only when VAT registered. */
  vatNumber: string | null;
  /** The person POPIA makes responsible: by default the owner or head of the business. */
  informationOfficer: string | null;
} = {
  registeredName: null,
  legalForm: null,
  registrationNumber: null,
  vatNumber: null,
  informationOfficer: null,
};

/**
 * What the About page (hidden for now, in `app/_about/`) still needs from the shop. NOT YET SUPPLIED:
 * every null is left off the public page until it is filled in, so nothing is
 * guessed and nothing says "coming soon". In development and on preview builds
 * the page marks each gap with a dashed slot naming the field. Only what is
 * true goes in; PRODUCT.md bans invented years, figures and testimonials.
 *
 * Also still needed, and held in `LEGAL` above: the registered name, legal
 * form, registration number, VAT number (only when registered) and the
 * Information Officer. They show on the About page's "Who is behind the shop".
 */
export const ABOUT: {
  /** Who runs the shop, as a customer would meet them: "Name Surname". */
  ownerName: string | null;
  /** Their part, e.g. "Owner", "Owner and photographer". */
  ownerRole: string | null;
  /** The year the shop opened, e.g. "2012". Never an estimate. */
  opened: string | null;
  /** How the shop started and why photos and gifts: one or two short paragraphs in the shop's own voice. */
  story: string[] | null;
  /** What a visit to the counter is like: one or two sentences, true on any ordinary weekday. */
  visit: string | null;
  /** A photograph of the shop or the people in it. `code` is its Cloudinary name under `products/<code>`, like every other photo, so it shares the site's two widths; `alt` describes it for a screen reader. */
  shopPhoto: { code: string; alt: string } | null;
  /** How long an order takes to make once paid, e.g. "Most orders are ready in 2 working days." Stated only when the shop will keep to it; the terms promise no date until one is confirmed in writing. */
  makeTime: string | null;
  /** How a school, club or business should order in quantity, and what the shop can offer them. Only once the line is confirmed. */
  businessCustomers: string | null;
} = {
  ownerName: null,
  ownerRole: null,
  opened: null,
  story: null,
  visit: null,
  shopPhoto: null,
  makeTime: null,
  businessCustomers: null,
};

type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

/** What the footer prints, and the same hours as search engines read them (24-hour, `opens`/`closes`, none when closed). */
export const HOURS: { days: string; time: string; closed?: boolean; weekdays: Weekday[]; opens?: string; closes?: string }[] = [
  { days: "Monday to Friday", time: "8:30am – 4pm", weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:30", closes: "16:00" },
  { days: "Saturday", time: "9am – 1pm", weekdays: ["Saturday"], opens: "09:00", closes: "13:00" },
  { days: "Sunday", time: "Closed", closed: true, weekdays: ["Sunday"] },
];

/** The standard delivery time the product page states under Add to cart. */
export const DELIVERY_TIME = "3\u20135 business days";

/**
 * Every verified product photograph, for the cover wall. Order is deliberate:
 * the photo-bearing gifts carry the colour, the quiet objects punctuate.
 */
export const WALL: Print[] = [
  GIFTS[0], FRAMES[0], CUSTOMER_PHOTOS[0], GIFTS[2], FRAMES[2],
  GIFTS[1], COUNTER[0], GIFTS[4], FRAMES[4], GIFTS[6],
  CUSTOMER_PHOTOS[1], GIFTS[3], FRAMES[3], GIFTS[5], FRAMES[5],
  GIFTS[7], FRAMES[1], COUNTER[1], CUSTOMER_PHOTOS[2], FRAMES[6],
  COUNTER[2], COUNTER[6], COUNTER[3], COUNTER[5],
];

/** Split into three rows that travel at different speeds across the cover. */
export const WALL_ROWS: Print[][] = [
  WALL.filter((_, i) => i % 3 === 0),
  WALL.filter((_, i) => i % 3 === 1),
  WALL.filter((_, i) => i % 3 === 2),
];

/**
 * The catalogue wheel, in the order the shop asked for: the photo tile first
 * and the rest following it round.
 */
const CATALOGUE_CYCLE: Print[] = [
  GIFTS[1], // ST1 — photo tile and easel
  GIFTS[2], // CB1 — glass cutting board
  GIFTS[8], // SM1 — photo mug
  GIFTS[0], // SP1 — photo puzzle
  GIFTS[9], // SBK1 — bottle opener keyring
  COUNTER[2], // TL1 — tree of life earrings
  GIFTS[6], // PG1 — photo snow globe
  GIFTS[5], // PH1 — pot holder
];

/**
 * What the wheel actually renders. Eight frames alone are narrower than a wide
 * screen once the wheel turns, which would open a gap at the arc's end, so the
 * cycle is laid down twice and wraps.
 *
 * The rotation is what keeps the tile where it has always sat. `Carousel`
 * centres the arc on the middle of this list — index 7.5 of sixteen — so
 * offsetting the cycle by one puts the tile at index 7, one step to the left
 * of the arc's top, exactly where the old twelve-frame row had it.
 */
export const CAROUSEL: Print[] = Array.from(
  { length: CATALOGUE_CYCLE.length * 2 },
  (_, n) => CATALOGUE_CYCLE[(n + 1) % CATALOGUE_CYCLE.length],
);

/**
 * The running band of what the shop turns out, supplied by the shop and fixed
 * in this order. It mixes what is made with what it is made for, because that
 * is how a customer arrives — with an occasion as often as with a product.
 */
export const MARQUEE_WORDS = [
  "Birthdays",
  "Printed Mugs",
  "Keyrings",
  "Holidays",
  "Snow Globes",
  "Photo Printing",
  "ID Photos",
  "Frames",
  "Wall Art",
  "Custom Puzzles",
  "Corporate Gifts",
  "Mother's Day",
  "Father's Day",
];
