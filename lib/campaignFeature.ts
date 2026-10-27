import {
  offWords,
  phaseOf,
  resolveCampaign,
  type Campaign,
  type DealProduct,
  type Names,
  type Rule,
  type Target,
} from "@/lib/catalog/campaigns";
import { priceLabel, productHref, rands, shelfHref, toListings } from "@/lib/catalog/listing";
import type { Availability } from "@/lib/catalog/stock";
import { filterTags } from "@/lib/catalog/tags";
import type { Product } from "@/lib/catalog/types";

/**
 * A campaign as a marketing email shows it, worked out from the campaign as it
 * stands when the email is made and the shop's own catalogue: no Firestore
 * here, so the same code renders a send, a preview and a test fixture.
 *
 * Whatever the deal is (a price off, buy some get some, a pair, a spend), the
 * email says it the same way: each rule as a sentence, when it runs, its
 * conditions, and the products it reaches as photo tiles. The products are the
 * ones the shop's own shelf would call specials (`toListings`), so a sold-out
 * product is left out and a spend over the whole order, which reaches no
 * product in particular, shows no tiles, only its sentence.
 */

/** Two columns of three: more than that stops being an email and starts being the shop. */
export const FEATURE_TILES = 6;

export type FeatureTile = {
  name: string;
  href: string;
  /** Absolute photo URL, square; null when the cloud isn't known. */
  image: string | null;
  /** "from R96", "R120". */
  price: string;
  /** What it cost before a price deal, "R120" or "from R120"; null when nothing lowers it. */
  was: string | null;
  /** Its first deal in the shop's words: "20% off", "Buy 1, get 1 free". */
  deal: string | null;
};

export type CampaignFeature = {
  name: string;
  /** The shop's one line for the campaign; "" when there isn't one. */
  blurb: string;
  /** "Ends Sunday 1 November", "Starts Friday 30 October, ends Sunday 8 November"; null for a live campaign with no end. */
  when: string | null;
  /** One sentence per rule: "20% off Frames", "Spend R500, save R50". */
  deals: string[];
  /** Fine print the campaign really has: a cap on orders or units. */
  conditions: string[];
  /** The deal needs a code (`caps.code`): the email carries the customer's own and says to enter it at checkout. */
  needsCode: boolean;
  /** This customer's code as written in the email ("K7M4Q-9XPD2"); null until one is made for them, and for a deal that needs none. */
  code: string | null;
  tiles: FeatureTile[];
  /** Products the deal reaches beyond the tiles. */
  more: number;
  /** Where the button goes, and what it says. */
  href: string;
  cta: string;
};

const SAST = "Africa/Johannesburg";

/**
 * "Sunday 1 November", with the time when it isn't a day's start or end:
 * "Sunday 1 November, 16:00". A campaign that ends at midnight ends with the
 * day before, which is how a shopper hears it ("ends Tuesday", not "ends
 * Wednesday at midnight").
 */
function moment(iso: string, edge: "start" | "end"): string {
  const read = (at: number) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-ZA", { timeZone: SAST, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date(at))
        .map((p) => [p.type, p.value]),
    );
  const at = Date.parse(iso);
  let parts = read(at);
  if (edge === "end" && parts.hour === "00" && parts.minute === "00") parts = read(at - 60_000);
  const day = `${parts.weekday} ${Number(parts.day)} ${parts.month}`;
  const time = `${parts.hour}:${parts.minute}`;
  return time === "23:59" || time === "00:00" ? day : `${day}, ${time}`;
}

function whenOf(c: Pick<Campaign, "startsAt" | "endsAt">, scheduled: boolean): string | null {
  const ends = c.endsAt ? `ends ${moment(c.endsAt, "end")}` : null;
  if (scheduled && c.startsAt) return [`Starts ${moment(c.startsAt, "start")}`, ends].filter(Boolean).join(", ");
  return ends ? ends.charAt(0).toUpperCase() + ends.slice(1) : null;
}

const conditionsOf = (caps: Campaign["caps"]): string[] => [
  ...(caps.orders !== null ? [`Limited to the first ${caps.orders.toLocaleString("en-ZA")} ${caps.orders === 1 ? "order" : "orders"}.`] : []),
  ...(caps.units !== null ? [`Limited to ${caps.units.toLocaleString("en-ZA")} ${caps.units === 1 ? "item" : "items"} at the deal.`] : []),
];

const AND = new Intl.ListFormat("en-ZA", { type: "conjunction" });

/** A tag as a shopper reads it in a sentence: "Mugs", "Mother’s Day gifts", "gifts for her". */
function tagPhrase(t: string, names: Names): string {
  const label = names.tag(t);
  switch (t.split(":")[0]) {
    case "occasion":
      return `${label} gifts`;
    case "for":
      return `gifts ${label.replace(/^For /, "for ")}`;
    default:
      return label;
  }
}

/** What a rule's target is called to a shopper: "everything", "Frames and Mugs", "Photo Snow Globes", "selected sizes of Photo Prints", "selected products". */
function targetPhrase(t: Target, products: readonly DealProduct[], names: Names): string {
  switch (t.kind) {
    case "all":
      return "everything";
    case "categories":
      return AND.format(t.ids.map(names.category));
    case "tags":
      return AND.format(t.tags.map((x) => tagPhrase(x, names)));
    case "products": {
      const found = t.items.flatMap((i) => {
        const name = products.find((p) => p.slug === i.slug)?.name;
        return name ? [i.skus ? `selected sizes of ${name}` : name] : [];
      });
      return found.length > 0 && found.length <= 3 ? AND.format(found) : "selected products";
    }
  }
}

/** A rule as one sentence to a shopper, whichever kind it is: "20% off Frames", "Buy 2, get 1 free on Mugs", "Spend R500, save R50". */
export function dealSentence(r: Rule, products: readonly DealProduct[], names: Names): string {
  const on = (t: Target) => targetPhrase(t, products, names);
  const off = offWords(r.off);
  switch (r.kind) {
    case "price":
      return r.off.kind === "price" ? `${on(r.target).replace(/^./, (c) => c.toUpperCase())} now ${off.replace(/^for /, "")}` : `${off.replace(/^./, (c) => c.toUpperCase())} ${on(r.target)}`;
    case "bxgy":
      return `Buy ${r.buy}, get ${r.get} ${off} on ${on(r.target)}`;
    case "pair":
      return `Buy ${on(r.buy)}, get ${r.per === 1 ? "" : `up to ${r.per} `}${on(r.get)} ${off}`;
    case "spend": {
      const save = r.off.kind === "percent" ? `save ${r.off.value}%` : `save ${offWords(r.off).replace(/ off$/, "")}`;
      return `Spend ${r.min === null ? "more" : rands(r.min)}${r.target.kind === "all" ? "" : ` on ${on(r.target)}`}, ${save}`;
    }
  }
}

export type FeatureInput = {
  campaign: Campaign;
  /** The active catalogue. */
  products: readonly Product[];
  categories: readonly { id: string; name: string }[];
  names: Names;
  /** SKUs the shop has run out of. */
  soldOut: Availability;
  /** The site's address, no trailing slash: every link in the email starts with it. */
  base: string;
  /** Cloudinary's cloud name, for the photos. */
  cloud: string | null;
  now: number;
};

/** Tags a link so the shop's analytics can tell what the email brought. */
const tagged = (url: string, campaign: string) => `${url}?utm_source=email&utm_medium=marketing&utm_campaign=${encodeURIComponent(campaign)}`;

/**
 * The campaign's email block, or null when it can't be sent: a draft, a paused
 * or an ended campaign must never be emailed as a deal.
 */
export function buildFeature({ campaign: c, products, categories, names, soldOut, base, cloud, now }: FeatureInput): CampaignFeature | null {
  const phase = phaseOf(c, now);
  if (phase !== "live" && phase !== "scheduled") return null;

  const dealProducts: DealProduct[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    tags: filterTags(p.tags),
    variants: p.variants.map((v) => ({ sku: v.sku, title: v.title, price: v.price })),
  }));
  const deals = c.rules.map((r) => dealSentence(r, dealProducts, names));

  // The shop's own cards, priced under this campaign alone: other deals stacking can only lower a price further, never raise it.
  const live = resolveCampaign(c, dealProducts, names, soldOut);
  const listings = toListings([...products], new Map(categories.map((x) => [x.id, x.name])), soldOut, [live]).filter((l) => l.special && !l.soldOut && l.photo);
  const shown = listings.slice(0, FEATURE_TILES);

  // Until it starts the shop still charges the full price, so a scheduled campaign shows its deal words and today's price, never a sale price the link won't give.
  const scheduled = phase === "scheduled";
  const span = (r: { min: number; max: number }) => (r.min === r.max ? rands(r.min) : `from ${rands(r.min)}`);
  const tiles = shown.map((l): FeatureTile => ({
    name: l.name,
    href: tagged(base + productHref(l.slug), c.id),
    image: cloud ? `https://res.cloudinary.com/${cloud}/image/upload/c_fill,g_auto,ar_1:1,w_400,f_jpg,q_auto/products/${l.photo}` : null,
    price: scheduled && l.was ? span(l.was) : priceLabel(l),
    was: !scheduled && l.was ? span(l.was) : null,
    deal: l.deals[0] ?? null,
  }));

  // One product: straight to it. Live: the Specials shelf. Not yet: the Specials shelf shows only what is live, so the whole shop.
  // A deal that needs a code is on no shelf, and its pages show full price: the whole shop, the code does the rest.
  const single = listings.length === 1;
  const path = single ? productHref(listings[0].slug) : phase === "live" && !c.caps.code ? shelfHref("specials") : "/shop";

  return {
    name: c.name,
    blurb: c.blurb.trim(),
    when: whenOf(c, phase === "scheduled"),
    deals,
    conditions: conditionsOf(c.caps),
    needsCode: c.caps.code,
    code: null,
    tiles,
    more: listings.length - shown.length,
    href: tagged(base + path, c.id),
    cta: single ? "Shop this deal" : phase === "live" && !c.caps.code ? "Shop the deals" : "Visit the shop",
  };
}
