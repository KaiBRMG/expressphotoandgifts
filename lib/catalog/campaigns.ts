import { productHref, rands, shelfHref } from "./listing";

/**
 * Campaigns: the shop's deals, and the one engine that prices them, shared by
 * the browser (cards, the product page, the cart) and the server (placing an
 * order, which is what charges). No Firestore here.
 *
 *   campaigns/{id}                    Campaign
 *   campaignCodes/{code}              one single-use code emailed to one customer, for a campaign that needs one
 *
 * A campaign holds one or more rules, each a sentence the shop writes:
 * - price: these are 20% off, R50 off, or sold for R199;
 * - bxgy:  buy 2 of these, get 1 more of them free (or reduced);
 * - pair:  buy this, and that is reduced, up to so many for each one bought;
 * - spend: spend R500 or more on these, save R50 (or 10%).
 *
 * Everything that applies stacks, in a fixed order: price deals first, each
 * on the price the last one left (stage 1); then item deals, priced from
 * there (stage 2); then spend thresholds, measured on what is left after
 * both (stage 3). No unit goes below R0. A stage-1 price is the price shown
 * on the shop; stages 2 and 3 depend on the cart and show as savings in it.
 */

/* ---- The campaign as the shop writes it ---------------------------------- */

export type Off =
  /** 1–100 per cent off each unit. */
  | { kind: "percent"; value: number | null }
  /** Cents off each unit. */
  | { kind: "amount"; value: number | null }
  /** Each unit sold for this many cents (never raised by it). */
  | { kind: "price"; value: number | null }
  | { kind: "free" };

export type OffKind = Off["kind"];

/** What a rule covers: everything, whole categories, products carrying a tag, or chosen products (all their sizes, or some). */
export type Target =
  | { kind: "all" }
  | { kind: "categories"; ids: string[] }
  | { kind: "tags"; tags: string[] }
  | { kind: "products"; items: { slug: string; skus: string[] | null }[] };

export type TargetKind = Target["kind"];

type RuleBase = { id: string; off: Off; /** The shop's own words for the deal on the shop; "" uses the generated ones. */ label: string };

export type Rule =
  | (RuleBase & { kind: "price"; target: Target })
  /** Buy `buy` of these, get `get` more of them at `off`; the cheapest are the ones reduced. */
  | (RuleBase & { kind: "bxgy"; target: Target; buy: number; get: number; limit: number | null })
  /** Buy one of `buy`, and up to `per` of `get` are at `off`. */
  | (RuleBase & { kind: "pair"; buy: Target; get: Target; per: number; limit: number | null })
  /** Spend `min` cents or more on `target`, and the order saves `off` (percent or amount). */
  | (RuleBase & { kind: "spend"; target: Target; min: number | null });

export type RuleKind = Rule["kind"];

export const RULE_KINDS: RuleKind[] = ["price", "bxgy", "pair", "spend"];

/** Which reductions each kind of rule can give. */
export const OFFS_FOR: Record<RuleKind, OffKind[]> = {
  price: ["percent", "amount", "price"],
  bxgy: ["free", "percent", "amount", "price"],
  pair: ["free", "percent", "amount", "price"],
  spend: ["amount", "percent"],
};

/** Stored: the shop's switch. Draft until scheduled; on (live or waiting for its start); paused; or ended by hand. */
export type CampaignStatus = "draft" | "on" | "paused" | "ended";

export type Caps = {
  /** Paid orders that may use it, then it ends. */
  orders: number | null;
  /** Discounted units, then it ends (the order that crosses it keeps its deal). */
  units: number | null;
  /**
   * Only with a one-time code: the deal is kept off the shop, and applies to
   * an order only when the customer enters a code emailed to them at
   * checkout. Email all mints each customer's own; each works once.
   */
  code: boolean;
};

/** Counted from paid orders, in the transaction that marks each paid; refunds are not taken off. Cents for money. */
export type Usage = { orders: number; units: number; discount: number; sales: number };

/** What staff edit. */
export type CampaignDraft = {
  name: string;
  /** ISO; null starts it the moment it is switched on. */
  startsAt: string | null;
  /** ISO; null runs until it is ended. */
  endsAt: string | null;
  rules: Rule[];
  caps: Caps;
  /** Headlines the storefront's specials band while live. */
  featured: boolean;
  /** One line for the band. */
  blurb: string;
};

export type Campaign = CampaignDraft & {
  id: string;
  status: CampaignStatus;
  used: Usage;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  /** When it was ended by hand. */
  endedAt?: string;
  /** Who did what to it, oldest first. */
  log?: CampaignLog[];
};

export type CampaignLog = { at: string; by: string; text: string };

export const NAME_MAX = 60;
export const BLURB_MAX = 120;
export const LABEL_MAX = 40;
export const MAX_RULES = 8;
export const MAX_PICKS = 200;

export const NO_USE: Usage = { orders: 0, units: 0, discount: 0, sales: 0 };
export const NO_CAPS: Caps = { orders: null, units: null, code: false };

export const RULE_NAMES: Record<RuleKind, string> = {
  price: "Price off",
  bxgy: "Buy some, get some",
  pair: "Buy this, that’s reduced",
  spend: "Spend and save",
};

export const RULE_HINTS: Record<RuleKind, string> = {
  price: "20% off, R50 off, or a sale price, on the products you choose.",
  bxgy: "Buy 1 get 1 free, or buy 2 get the third half price.",
  pair: "Buy a frame, and its print is half price.",
  spend: "Spend R500 or more, and save R50 on the order.",
};

const ruleId = () => Math.random().toString(36).slice(2, 10);

/** A new rule of a kind, with the shop's likeliest start. */
export function newRule(kind: RuleKind): Rule {
  const id = ruleId();
  switch (kind) {
    case "price":
      return { id, kind, target: { kind: "products", items: [] }, off: { kind: "percent", value: 20 }, label: "" };
    case "bxgy":
      return { id, kind, target: { kind: "products", items: [] }, buy: 1, get: 1, off: { kind: "free" }, limit: null, label: "" };
    case "pair":
      return { id, kind, buy: { kind: "products", items: [] }, get: { kind: "products", items: [] }, per: 1, off: { kind: "percent", value: 50 }, limit: null, label: "" };
    case "spend":
      return { id, kind, target: { kind: "all" }, min: 50000, off: { kind: "amount", value: 5000 }, label: "" };
  }
}

export const blankDraft = (kind?: RuleKind): CampaignDraft => ({
  name: "",
  startsAt: null,
  endsAt: null,
  rules: kind ? [newRule(kind)] : [],
  caps: NO_CAPS,
  featured: false,
  blurb: "",
});

export const draftOf = (c: CampaignDraft): CampaignDraft => ({
  name: c.name,
  startsAt: c.startsAt,
  endsAt: c.endsAt,
  rules: c.rules,
  caps: c.caps,
  featured: c.featured,
  blurb: c.blurb,
});

/* ---- Where a campaign is in its life ------------------------------------- */

export type Phase = "draft" | "scheduled" | "live" | "paused" | "ended";

export const PHASE_LABELS: Record<Phase, string> = { draft: "Draft", scheduled: "Scheduled", live: "Live", paused: "Paused", ended: "Ended" };

/** Why an ended campaign ended: by hand, its dates, or its cap. */
export type EndedBy = "hand" | "dates" | "cap";

export function capReached(c: Pick<Campaign, "caps" | "used">): boolean {
  return (c.caps.orders !== null && c.used.orders >= c.caps.orders) || (c.caps.units !== null && c.used.units >= c.caps.units);
}

const ms = (iso: string | null) => (iso ? Date.parse(iso) : NaN);

export function phaseOf(c: Pick<Campaign, "status" | "startsAt" | "endsAt" | "caps" | "used">, now: number): Phase {
  if (c.status === "draft") return "draft";
  if (c.status === "ended") return "ended";
  if (c.endsAt && ms(c.endsAt) <= now) return "ended";
  if (capReached(c)) return "ended";
  if (c.status === "paused") return "paused";
  return c.startsAt && ms(c.startsAt) > now ? "scheduled" : "live";
}

export function endedBy(c: Pick<Campaign, "status" | "endsAt" | "caps" | "used">, now: number): EndedBy {
  if (c.status === "ended") return "hand";
  if (c.endsAt && ms(c.endsAt) <= now) return "dates";
  return capReached(c) ? "cap" : "hand";
}

/** Live at a moment, by its dates alone: what the browser checks of a campaign the server has already found switched on. */
export const inWindow = (c: { startsAt: string | null; endsAt: string | null }, now: number) =>
  !(c.startsAt && ms(c.startsAt) > now) && !(c.endsAt && ms(c.endsAt) <= now);

/* ---- Targets, against the catalogue -------------------------------------- */

/** What the engine and the editor need of a product. */
export type DealProduct = {
  slug: string;
  name: string;
  categoryId: string;
  tags: string[];
  variants: { sku: string; title: string; price: number | null }[];
};

/** The priced SKUs a target covers. */
export function targetSkus(t: Target, products: readonly DealProduct[]): string[] {
  const priced = (p: DealProduct) => p.variants.filter((v) => v.price !== null).map((v) => v.sku);
  switch (t.kind) {
    case "all":
      return products.flatMap(priced);
    case "categories":
      return products.filter((p) => t.ids.includes(p.categoryId)).flatMap(priced);
    case "tags":
      return products.filter((p) => p.tags.some((x) => t.tags.includes(x))).flatMap(priced);
    case "products": {
      const bySlug = new Map(products.map((p) => [p.slug, p]));
      return t.items.flatMap((i) => {
        const p = bySlug.get(i.slug);
        if (!p) return [];
        const skus = priced(p);
        return i.skus ? skus.filter((s) => i.skus!.includes(s)) : skus;
      });
    }
  }
}

/** True when a target names nothing yet. */
export const targetEmpty = (t: Target) =>
  (t.kind === "categories" && t.ids.length === 0) || (t.kind === "tags" && t.tags.length === 0) || (t.kind === "products" && t.items.length === 0);

/** Names to call a target by, on the shop. */
export type Names = { category: (id: string) => string; tag: (tag: string) => string };

const OR = new Intl.ListFormat("en-ZA", { type: "disjunction" });

/** "Coffee Mug", "Frames", "Mugs or Puzzles", "everything": a target, as a shopper reads it. */
export function targetName(t: Target, products: readonly DealProduct[], names: Names): string {
  switch (t.kind) {
    case "all":
      return "anything";
    case "categories":
      return OR.format(t.ids.map(names.category));
    case "tags":
      return OR.format(t.tags.map(names.tag));
    case "products": {
      const found = t.items.map((i) => products.find((p) => p.slug === i.slug)?.name).filter((n): n is string => Boolean(n));
      return found.length <= 2 ? OR.format(found) : "selected items";
    }
  }
}

/** Every SKU any rule of a campaign touches, either side of a deal. */
export function campaignSkus(rules: readonly Rule[], products: readonly DealProduct[]): { buy: Set<string>; get: Set<string> } {
  const buy = new Set<string>();
  const get = new Set<string>();
  for (const r of rules) {
    if (r.kind === "pair") {
      targetSkus(r.buy, products).forEach((s) => buy.add(s));
      targetSkus(r.get, products).forEach((s) => get.add(s));
    } else targetSkus(r.target, products).forEach((s) => buy.add(s));
  }
  return { buy, get };
}

/* ---- Resolved: a live campaign as the engine takes it --------------------- */

export type LiveRule =
  | { id: string; kind: "price"; skus: string[]; off: Off; label: string }
  | { id: string; kind: "bxgy"; skus: string[]; buy: number; get: number; off: Off; limit: number | null; label: string; name: string; href: string | null }
  | { id: string; kind: "pair"; buySkus: string[]; getSkus: string[]; per: number; off: Off; limit: number | null; label: string; buyName: string; getName: string; href: string | null }
  /** `skus` null: the whole order counts. */
  | { id: string; kind: "spend"; skus: string[] | null; min: number; off: Off; label: string };

export type LiveCampaign = {
  id: string;
  name: string;
  blurb: string;
  featured: boolean;
  startsAt: string | null;
  endsAt: string | null;
  rules: LiveRule[];
};

/** Where a nudge sends a shopper for more: the one product a target names, or the specials shelf. */
function hrefFor(t: Target): string {
  if (t.kind === "products" && t.items.length === 1) return productHref(t.items[0].slug);
  return shelfHref(t.kind === "categories" && t.ids.length === 1 ? t.ids[0] : "specials");
}

/** A target over everything holds most of the catalogue, so each list is looked up through a Set, built once per list. */
const sets = new WeakMap<readonly string[], Set<string>>();

/** Whether a resolved rule's SKU list holds a SKU; a null list (a spend over everything) holds none. */
export function inList(list: readonly string[] | null, sku: string): boolean {
  if (!list) return false;
  let set = sets.get(list);
  if (!set) sets.set(list, (set = new Set(list)));
  return set.has(sku);
}

/**
 * A campaign with its targets turned into SKUs, and named, for the engine.
 * A sold-out SKU (`soldOut`, each at 0) is left off the side of a deal that is
 * given away, so the shop never nudges toward something it can't hand over.
 */
export function resolveCampaign(c: Pick<Campaign, "id" | "name" | "blurb" | "featured" | "startsAt" | "endsAt" | "rules">, products: readonly DealProduct[], names: Names, soldOut: Record<string, number> = {}): LiveCampaign {
  const rules = c.rules.flatMap((r) => resolveRule(r, products, names, soldOut) ?? []);
  return { id: c.id, name: c.name, blurb: c.blurb, featured: c.featured, startsAt: c.startsAt, endsAt: c.endsAt, rules };
}

/** One rule as the engine takes it, or null while it is incomplete. */
export function resolveRule(r: Rule, products: readonly DealProduct[], names: Names, soldOut: Record<string, number> = {}): LiveRule | null {
  const inStock = (skus: string[]) => skus.filter((s) => soldOut[s] !== 0);
  if (!offComplete(r.off)) return null;
  switch (r.kind) {
      case "price":
        return { id: r.id, kind: r.kind, skus: targetSkus(r.target, products), off: r.off, label: r.label };
      case "bxgy":
        return { id: r.id, kind: r.kind, skus: targetSkus(r.target, products), buy: r.buy, get: r.get, off: r.off, limit: r.limit, label: r.label, name: targetName(r.target, products, names), href: hrefFor(r.target) };
      case "pair":
        return (
          {
            id: r.id,
            kind: r.kind,
            buySkus: targetSkus(r.buy, products),
            getSkus: inStock(targetSkus(r.get, products)),
            per: r.per,
            off: r.off,
            limit: r.limit,
            label: r.label,
            buyName: targetName(r.buy, products, names),
            getName: targetName(r.get, products, names),
            href: hrefFor(r.get),
          }
        );
      case "spend":
        return r.min === null ? null : { id: r.id, kind: r.kind, skus: r.target.kind === "all" ? null : targetSkus(r.target, products), min: r.min, off: r.off, label: r.label };
  }
}

/** The order campaigns stack in: oldest start first, then by id, so the server and the browser agree. */
export const stackOrder = <T extends { id: string; startsAt: string | null }>(cs: T[]): T[] =>
  [...cs].sort((a, b) => (ms(a.startsAt) || 0) - (ms(b.startsAt) || 0) || a.id.localeCompare(b.id));

/* ---- Words for a deal, on the shop ----------------------------------------- */

const offComplete = (o: Off) => o.kind === "free" || (o.value !== null && o.value > 0);

/** A reduction's number: per cent, or cents; 0 for free, which has none. */
const offValue = (o: Off) => (o.kind === "free" ? 0 : (o.value ?? 0));

/** "free", "half price", "20% off", "R50 off", "for R99". */
export function offWords(o: Off): string {
  if (o.kind === "free") return "free";
  const v = o.value ?? 0;
  if (o.kind === "percent") return v === 50 ? "half price" : v >= 100 ? "free" : `${v}% off`;
  if (o.kind === "amount") return `${rands(v)} off`;
  return `for ${rands(v)}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The words a product card, the product page and the cart show for a rule.
 * `side`, for a pair: whether the product is the one bought or the one reduced.
 */
export function dealLabel(r: LiveRule, side: "buy" | "get" = "buy"): string {
  if (r.label) return r.label;
  switch (r.kind) {
    case "price":
      return r.off.kind === "price" ? `Now ${rands(offValue(r.off))}` : cap(offWords(r.off));
    case "bxgy":
      return `Buy ${r.buy}, get ${r.get} ${offWords(r.off)}`;
    case "pair":
      return side === "get" ? `${cap(offWords(r.off))} with ${r.buyName}` : `With this: ${r.getName} ${offWords(r.off)}`;
    case "spend":
      return r.off.kind === "percent" ? `Spend ${rands(r.min)}, get ${r.off.value}% off` : `Spend ${rands(r.min)}, save ${rands(offValue(r.off))}`;
  }
}

/** The deal in a line, for staff: "20% off Frames", "Buy 1, get 1 free: Mugs", "Spend R500, save R50". */
export function ruleSentence(r: Rule, products: readonly DealProduct[], names: Names): string {
  const on = (t: Target) => (targetEmpty(t) ? "nothing chosen yet" : targetName(t, products, names));
  const off = offComplete(r.off) ? offWords(r.off) : "an amount still to set";
  switch (r.kind) {
    case "price":
      return r.off.kind === "price" ? `${cap(on(r.target))} ${off}` : `${cap(off)} ${on(r.target)}`;
    case "bxgy":
      return `Buy ${r.buy}, get ${r.get} ${off}: ${on(r.target)}`;
    case "pair":
      return `Buy ${on(r.buy)}, ${r.per === 1 ? "one" : `up to ${r.per}`} ${on(r.get)} ${off}`;
    case "spend": {
      const save = !offComplete(r.off) ? off : r.off.kind === "percent" ? `${offValue(r.off)}% off` : `save ${rands(offValue(r.off))}`;
      return `Spend ${r.min === null ? "an amount still to set" : rands(r.min)}${r.target.kind === "all" ? "" : ` on ${on(r.target)}`}, ${save}`;
    }
  }
}

/* ---- The engine ------------------------------------------------------------ */

/** A cart line as the engine takes it: its catalogue price, before any deal. */
export type DealLine = { sku: string; quantity: number; price: number };

/** What one rule took off, in cents, and how many units it reduced. */
export type Saving = { campaign: string; name: string; rule: string; label: string; stage: 1 | 2 | 3; amount: number; units: number };

/**
 * A cart line priced: `price` is each unit after the price deals (stage 1),
 * what the shop shows; `net` is what the whole line comes to after every
 * deal, its share of a spend threshold included: what it really cost, for a
 * refund of it alone.
 */
export type PricedLine = { sku: string; quantity: number; base: number; price: number; net: number };

/** What the cart could add for more off. */
export type Nudge = { campaign: string; rule: string; label: string; text: string; href: string | null };

export type DealPriced = {
  lines: PricedLine[];
  /** Every saving, every stage. */
  savings: Saving[];
  /** Σ price × quantity: after the price deals. */
  subtotal: number;
  /** What the item deals and spend thresholds take off the subtotal. */
  discount: number;
  /** The goods: subtotal less discount. */
  total: number;
  nudges: Nudge[];
};

/** A unit after a reduction; never negative, never raised. */
export function reduce(p: number, o: Off): number {
  switch (o.kind) {
    case "free":
      return 0;
    case "percent":
      return Math.max(0, Math.round((p * (100 - Math.min(100, o.value ?? 0))) / 100));
    case "amount":
      return Math.max(0, p - (o.value ?? 0));
    case "price":
      return Math.min(p, o.value ?? p);
  }
}

/** Each unit's price after the price deals of these campaigns (stage 1), with what each took. */
export function stageOne(sku: string, base: number, campaigns: readonly LiveCampaign[]): { price: number; steps: { campaign: LiveCampaign; rule: LiveRule; off: number }[] } {
  let price = base;
  const steps: { campaign: LiveCampaign; rule: LiveRule; off: number }[] = [];
  for (const c of campaigns)
    for (const r of c.rules) {
      if (r.kind !== "price" || !inList(r.skus, sku)) continue;
      const next = reduce(price, r.off);
      if (next < price) steps.push({ campaign: c, rule: r, off: price - next });
      price = next;
    }
  return { price, steps };
}

const units = (n: number) => (n === 1 ? "it’s" : "they’re");

/**
 * Prices a cart under the campaigns live now (already filtered, in
 * `stackOrder`). Lines are the ones the shop can sell: sold-out lines never
 * reach here, so they never count toward a deal.
 */
export function priceDeals(lines: readonly DealLine[], campaigns: readonly LiveCampaign[]): DealPriced {
  const saved = new Map<string, Saving>();
  // The units each campaign reduced, by their place in the pool: a unit two of its rules reduce counts once toward its cap.
  const reached = new Map<string, Set<number>>();
  const save = (c: LiveCampaign, r: LiveRule, stage: Saving["stage"], amount: number, units: number[], side: "buy" | "get" = "buy") => {
    if (amount <= 0) return;
    const key = `${c.id}/${r.id}`;
    const s = saved.get(key) ?? saved.set(key, { campaign: c.id, name: c.name, rule: r.id, label: dealLabel(r, side), stage, amount: 0, units: 0 }).get(key)!;
    const seen = reached.get(c.id) ?? reached.set(c.id, new Set()).get(c.id)!;
    s.amount += amount;
    for (const u of units)
      if (!seen.has(u)) {
        seen.add(u);
        s.units++;
      }
  };
  const nudges: Nudge[] = [];

  // Every unit on its own, so item deals can reduce some of a line and not the rest.
  const pool = lines.flatMap((l, line) => Array.from({ length: l.quantity }, () => ({ sku: l.sku, line, price: l.price })));
  const unitsOf = (line: number) => pool.flatMap((u, i) => (u.line === line ? [i] : []));

  // Stage 1: the price deals, the same on every unit of a line.
  const priced = lines.map((l, line) => {
    const one = stageOne(l.sku, l.price, campaigns);
    for (const s of one.steps) save(s.campaign, s.rule, 1, s.off * l.quantity, unitsOf(line));
    return { sku: l.sku, quantity: l.quantity, base: l.price, price: one.price };
  });
  for (const u of pool) u.price = priced[u.line].price;

  // Ties between units of the same price go by SKU, then place: never by the cart's order, which the browser and the server may not share.
  const tie = (a: number, b: number) => (pool[a].sku < pool[b].sku ? -1 : pool[a].sku > pool[b].sku ? 1 : a - b);

  // Stage 2: the item deals, over every unit at its stage-1 price.
  for (const c of campaigns)
    for (const r of c.rules) {
      if (r.kind !== "bxgy" && r.kind !== "pair") continue;
      const [buyList, getList, n, m] = r.kind === "bxgy" ? [r.skus, r.skus, r.buy, r.get] : [r.buySkus, r.getSkus, 1, r.per];
      const idx = pool.map((_, i) => i);
      // The dearest are bought, the cheapest reduced.
      const buys = idx.filter((i) => inList(buyList, pool[i].sku)).sort((a, b) => pool[b].price - pool[a].price || tie(a, b));
      const gets = idx.filter((i) => inList(getList, pool[i].sku)).sort((a, b) => pool[a].price - pool[b].price || tie(a, b));
      const used = new Set<number>();
      let times = 0;
      // Why the deal stopped short of the limit: too few bought (`haveBuys` of n), or rewards missing (`missing` of m).
      let short: { on: "buy"; haveBuys: number } | { on: "get"; missing: number } | null = null;
      while (r.limit === null || times < r.limit) {
        const bought = buys.filter((i) => !used.has(i)).slice(0, n);
        if (bought.length < n) {
          short = { on: "buy", haveBuys: bought.length };
          break;
        }
        const taken = new Set(bought);
        const reward = gets.filter((i) => !used.has(i) && !taken.has(i)).slice(0, m);
        if (reward.length === 0) {
          short = { on: "get", missing: m };
          break;
        }
        bought.forEach((i) => used.add(i));
        for (const i of reward) {
          used.add(i);
          const next = reduce(pool[i].price, r.off);
          save(c, r, 2, pool[i].price - next, [i], "get");
          pool[i].price = next;
        }
        times++;
        if (reward.length < m) {
          short = { on: "get", missing: m - reward.length };
          break;
        }
      }
      // What one more would bring, while the deal has room.
      if (!short) continue;
      const label = dealLabel(r, "get");
      if (short.on === "get") {
        const k = short.missing;
        if (r.kind === "bxgy") nudges.push({ campaign: c.id, rule: r.id, label, text: `Add ${k} more and ${units(k)} ${offWords(r.off)}.`, href: r.href });
        else if (r.getSkus.length) nudges.push({ campaign: c.id, rule: r.id, label, text: `Add ${r.getName} and ${units(k)} ${offWords(r.off)} with your ${r.buyName}.`, href: r.href });
      } else if (r.kind === "bxgy" && short.haveBuys > 0) {
        nudges.push({ campaign: c.id, rule: r.id, label, text: `Add ${n - short.haveBuys + m} more: buy ${n}, get ${m} ${offWords(r.off)}.`, href: r.href });
      }
    }

  const subtotal = priced.reduce((s, l) => s + l.price * l.quantity, 0);
  const afterItems = pool.reduce((s, u) => s + u.price, 0);
  // What each unit comes to after every stage; a spend threshold's saving is shared across the units it counted.
  const net = pool.map((u) => u.price);

  // Stage 3: spend thresholds, each measured on what the item deals left.
  let discount = subtotal - afterItems;
  let left = afterItems;
  for (const c of campaigns)
    for (const r of c.rules) {
      if (r.kind !== "spend") continue;
      const counted = pool.flatMap((u, i) => (!r.skus || inList(r.skus, u.sku) ? [i] : []));
      const spent = counted.reduce((s, i) => s + pool[i].price, 0);
      if (spent >= r.min) {
        // Never more than what it counted still comes to: a saving on frames can't come off the mugs.
        const room = counted.reduce((s, i) => s + net[i], 0);
        const off = Math.min(left, room, r.off.kind === "percent" ? Math.round((spent * Math.min(100, offValue(r.off))) / 100) : offValue(r.off));
        share(net, counted, off);
        save(c, r, 3, off, []);
        discount += off;
        left -= off;
      } else if (counted.length > 0 && spent >= r.min * 0.4) {
        const gain = r.off.kind === "percent" ? `get ${r.off.value}% off` : `save ${rands(offValue(r.off))}`;
        nudges.push({ campaign: c.id, rule: r.id, label: dealLabel(r), text: `Add ${rands(r.min - spent)} more to ${gain}.`, href: r.skus ? "/shop/specials" : null });
      }
    }

  const withNet = priced.map((l, line) => ({ ...l, net: unitsOf(line).reduce((s, i) => s + net[i], 0) }));
  return { lines: withNet, savings: [...saved.values()], subtotal, discount, total: subtotal - discount, nudges };
}

/**
 * Takes `off` cents from the units at `at`, in proportion to what each still
 * comes to, whole cents only: the remainder goes a cent at a time to the
 * dearest, and none goes below nothing. Mutates `net`.
 */
function share(net: number[], at: number[], off: number) {
  const worth = at.reduce((s, i) => s + net[i], 0);
  if (worth <= 0 || off <= 0) return;
  let given = 0;
  for (const i of at) {
    const part = Math.min(net[i], Math.floor((off * net[i]) / worth));
    net[i] -= part;
    given += part;
  }
  const order = [...at].sort((a, b) => net[b] - net[a] || a - b);
  while (given < off && order.some((i) => net[i] > 0))
    for (const i of order) {
      if (given >= off) break;
      if (net[i] > 0) {
        net[i]--;
        given++;
      }
    }
}

/** The savings a cart shows under its lines: the item deals and spend thresholds, stage 1 being in the prices already. */
export const cartSavings = (p: { savings?: readonly Saving[] }) => (p.savings ?? []).filter((s) => s.stage > 1);

/* ---- On a card and a product page ---------------------------------------- */

/** What a product's card and page say of its deals: its price range after the price deals, and the words for the rest. */
export type ProductDeal = {
  /** Cents, after stage 1, per SKU that a price deal lowers. */
  now: Record<string, number>;
  labels: string[];
  /** Any deal reaches it, so it is on the Specials shelf (unless sold out). */
  special: boolean;
  /** Its priced sizes' range after the price deals, and before them when the deals lower it; null when nothing is priced. */
  range: { min: number; max: number } | null;
  was: { min: number; max: number } | null;
  /** The words on its photo: its first deal's, or "Special" for a price deal alone. */
  headline: string | null;
};

const span = (prices: number[]) => (prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null);

/**
 * A product's deals among the live campaigns. A spend threshold over the whole
 * shop doesn't make every product a special, so only one aimed at products
 * counts toward the shelf and the labels.
 */
export function productDeal(p: { variants: readonly { sku: string; price: number | null }[] }, campaigns: readonly LiveCampaign[]): ProductDeal {
  const skus = p.variants.filter((v) => v.price !== null).map((v) => v.sku);
  const now: Record<string, number> = {};
  for (const v of p.variants) {
    if (v.price === null) continue;
    const one = stageOne(v.sku, v.price, campaigns);
    if (one.price < v.price) now[v.sku] = one.price;
  }
  const labels = new Set<string>();
  const touches = (list: string[] | null) => skus.some((s) => inList(list, s));
  for (const c of campaigns)
    for (const r of c.rules) {
      if (r.kind === "pair") {
        if (touches(r.getSkus)) labels.add(dealLabel(r, "get"));
        else if (touches(r.buySkus) && r.getSkus.length) labels.add(dealLabel(r, "buy"));
      } else if (touches(r.skus)) labels.add(dealLabel(r));
    }
  const priced = p.variants.filter((v) => v.price !== null);
  const lowered = Object.keys(now).length > 0;
  const range = span(priced.map((v) => now[v.sku] ?? v.price!));
  return {
    now,
    labels: [...labels],
    special: labels.size > 0 || lowered,
    range,
    was: lowered ? span(priced.map((v) => v.price!)) : null,
    headline: [...labels][0] ?? (lowered ? "Special" : null),
  };
}

/** The live campaigns whose deals reach a size, either side of a deal. */
export function campaignsFor(sku: string, campaigns: readonly LiveCampaign[]): LiveCampaign[] {
  return campaigns.filter((c) =>
    c.rules.some((r) => (r.kind === "pair" ? inList(r.buySkus, sku) || inList(r.getSkus, sku) : inList(r.skus, sku))),
  );
}

/* ---- Checking a draft -------------------------------------------------------- */

export type Problem = { message: string; rule?: string };

const posInt = (n: unknown, max = 999_999): n is number => typeof n === "number" && Number.isSafeInteger(n) && n > 0 && n <= max;

/** Why a reduction isn't whole yet, or null. */
export function offProblem(o: Off): string | null {
  if (o.kind === "free") return null;
  if (o.value === null) return "Say how much off.";
  if (o.kind === "percent" && (!posInt(o.value, 100))) return "A percentage is a whole number from 1 to 100.";
  if (o.kind !== "percent" && !posInt(o.value, 10_000_000)) return "Give an amount in rand, more than R0.";
  return null;
}

/**
 * What stands between a draft and the shop: each problem names the rule it is
 * in. A draft may be saved with any of these; it can't be scheduled until
 * there are none.
 */
export function campaignProblems(d: CampaignDraft, products: readonly DealProduct[], now: number): Problem[] {
  const out: Problem[] = [];
  if (d.name.trim().length < 2) out.push({ message: "Give the campaign a name." });
  if (d.rules.length === 0) out.push({ message: "Add a deal: what shoppers get." });
  if (d.startsAt && d.endsAt && ms(d.endsAt) <= ms(d.startsAt)) out.push({ message: "It ends before it starts. Check the dates." });
  else if (d.endsAt && ms(d.endsAt) <= now) out.push({ message: "Its end date has passed. Choose a later one." });
  if (d.featured && d.blurb.trim().length === 0) out.push({ message: "Write the line the storefront shows, or untick Feature on the shop." });
  d.rules.forEach((r, i) => {
    const which = d.rules.length > 1 ? `Deal ${i + 1}: ` : "";
    const say = (message: string) => out.push({ message: which + message, rule: r.id });
    const covers = (t: Target, what: string) => {
      if (targetEmpty(t)) say(`Choose ${what}.`);
      else if (targetSkus(t, products).length === 0) say(`Nothing priced in the shop matches ${what === "the products" ? "these products" : what}.`);
    };
    const off = offProblem(r.off);
    if (off) say(off);
    if (r.kind === "pair") {
      covers(r.buy, "what shoppers buy");
      covers(r.get, "what is reduced");
      if (!posInt(r.per, 99)) say("Say how many are reduced for each one bought.");
    } else covers(r.target, r.kind === "spend" ? "what counts toward the spend" : "the products");
    if (r.kind === "bxgy" && (!posInt(r.buy, 99) || !posInt(r.get, 99))) say("Say how many they buy and how many they get.");
    if (r.kind === "spend" && !posInt(r.min, 10_000_000)) say("Say how much they spend.");
    if ((r.kind === "bxgy" || r.kind === "pair") && r.limit !== null && !posInt(r.limit, 99)) say("The most per order is a whole number, 1 or more.");
  });
  return out;
}

/**
 * What may cost the shop money unmeant, for staff to confirm before it runs:
 * a deal that gives things away or takes over half off, a sale price that
 * changes nothing, a spend threshold that saves most of what it asks, and
 * the shop's own words naming a different amount than the deal gives. None
 * of these stops a campaign; each is asked about.
 */
export function campaignWarnings(d: CampaignDraft, products: readonly DealProduct[], names: Names): Problem[] {
  const out: Problem[] = [];
  const price = new Map(products.flatMap((p) => p.variants.map((v) => [v.sku, v.price] as const)));
  const sizes = (n: number) => `${n} ${n === 1 ? "size" : "sizes"}`;
  d.rules.forEach((r, i) => {
    const which = d.rules.length > 1 ? `Deal ${i + 1}: ` : "";
    const say = (message: string) => out.push({ message: which + message, rule: r.id });
    if (offProblem(r.off)) return;

    if (r.kind === "spend") {
      if (r.min === null) return;
      const v = offValue(r.off);
      if (r.off.kind === "amount" && v >= r.min) say(`It saves ${rands(v)} on a spend of ${rands(r.min)}, so an order could come to nothing.`);
      else if (r.off.kind === "amount" && v > r.min / 2) say(`It saves ${rands(v)} on a spend of ${rands(r.min)}: over half of it.`);
      else if (r.off.kind === "percent" && v >= 50) say(`It takes ${v}% off every order that reaches ${rands(r.min)}.`);
    } else {
      // The side that is reduced: a pair reduces what's given; the others reduce what they cover.
      const skus = targetSkus(r.kind === "pair" ? r.get : r.target, products);
      const bases = skus.map((s) => price.get(s)).filter((p): p is number => typeof p === "number");
      const after = bases.map((b) => ({ b, a: reduce(b, r.off) }));
      const free = after.filter((x) => x.a === 0).length;
      const deep = after.filter((x) => x.a > 0 && x.a < x.b / 2).length;
      const same = after.filter((x) => x.a === x.b).length;
      const given = r.kind !== "price" && r.off.kind === "free";
      if (free && !given) say(`It makes ${sizes(free)} free.`);
      if (deep && r.kind === "price") say(`It takes over half off ${sizes(deep)}.`);
      if (same && r.off.kind === "price") say(`${sizes(same)} already cost ${rands(offValue(r.off))} or less, so the sale price doesn’t change ${same === 1 ? "it" : "them"}.`);
    }

    // The shop's words against the deal's: every amount the words name must be one the deal gives.
    if (r.label) {
      const live = resolveRule({ ...r, label: "" }, products, names);
      if (!live) return;
      const meant = dealLabel(live, r.kind === "pair" ? "get" : "buy");
      const nums = (t: string) => (t.replace(/(\d)[\s,](?=\d{3}\b)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
      const allowed = new Set([...nums(meant), ...(meant.includes("half") ? [50] : [])]);
      const stray = nums(r.label).filter((n) => !allowed.has(n));
      if (stray.length) say(`The words “${r.label}” name ${stray.join(", ")}, which the deal doesn’t give: it is “${meant}”.`);
    }
  });
  // A deal that needs a code is never on the shop, so nothing there can lead with it.
  if (d.caps.code && d.featured) out.push({ message: "It needs a code, so it isn’t on the shop: the storefront’s specials band will not show it." });
  return out;
}

/* ---- Reading what the browser sends --------------------------------------- */

const str = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const strs = (x: unknown, max = MAX_PICKS) => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === "string" && s.length > 0 && s.length <= 120))].slice(0, max) : []);
const intOrNull = (x: unknown, max: number) => (typeof x === "number" && Number.isSafeInteger(x) && x > 0 && x <= max ? x : null);
const iso = (x: unknown) => (typeof x === "string" && !Number.isNaN(Date.parse(x)) ? new Date(x).toISOString() : null);

function readTarget(x: unknown): Target {
  const t = x as { kind?: unknown; ids?: unknown; tags?: unknown; items?: unknown } | null;
  switch (t?.kind) {
    case "all":
      return { kind: "all" };
    case "categories":
      return { kind: "categories", ids: strs(t.ids, 20) };
    case "tags":
      return { kind: "tags", tags: strs(t.tags, 40) };
    default: {
      const items = Array.isArray(t?.items) ? t.items : [];
      const seen = new Set<string>();
      return {
        kind: "products",
        items: items.slice(0, MAX_PICKS).flatMap((i: { slug?: unknown; skus?: unknown }) => {
          if (typeof i?.slug !== "string" || !i.slug || seen.has(i.slug)) return [];
          seen.add(i.slug);
          return [{ slug: i.slug, skus: i.skus === null ? null : strs(i.skus, 60) }];
        }),
      };
    }
  }
}

function readOff(x: unknown, allowed: OffKind[]): Off {
  const o = x as { kind?: unknown; value?: unknown } | null;
  const kind = allowed.includes(o?.kind as OffKind) ? (o!.kind as OffKind) : allowed[0];
  if (kind === "free") return { kind };
  return { kind, value: intOrNull(o?.value, kind === "percent" ? 100 : 10_000_000) };
}

function readRule(x: unknown): Rule | null {
  const r = x as Record<string, unknown> | null;
  if (!r || typeof r.kind !== "string" || !(r.kind in OFFS_FOR)) return null;
  const kind = r.kind as RuleKind;
  const base = { id: str(r.id, 20) || ruleId(), off: readOff(r.off, OFFS_FOR[kind]), label: str(r.label, LABEL_MAX) };
  switch (kind) {
    case "price":
      return { ...base, kind, target: readTarget(r.target) };
    case "bxgy":
      return { ...base, kind, target: readTarget(r.target), buy: intOrNull(r.buy, 99) ?? 1, get: intOrNull(r.get, 99) ?? 1, limit: intOrNull(r.limit, 99) };
    case "pair":
      return { ...base, kind, buy: readTarget(r.buy), get: readTarget(r.get), per: intOrNull(r.per, 99) ?? 1, limit: intOrNull(r.limit, 99) };
    case "spend":
      return { ...base, kind, target: readTarget(r.target), min: intOrNull(r.min, 10_000_000) };
  }
}

/** A draft as the browser sent it, cleaned, or null when it isn't one. */
export function readDraft(x: unknown): CampaignDraft | null {
  const d = x as Record<string, unknown> | null;
  if (!d || typeof d !== "object" || !Array.isArray(d.rules) || d.rules.length > MAX_RULES) return null;
  const rules = d.rules.map(readRule);
  if (!rules.every(Boolean)) return null;
  const caps = (d.caps ?? {}) as Record<string, unknown>;
  return {
    name: str(d.name, NAME_MAX),
    startsAt: iso(d.startsAt),
    endsAt: iso(d.endsAt),
    rules: rules as Rule[],
    caps: { orders: intOrNull(caps.orders, 999_999), units: intOrNull(caps.units, 999_999), code: caps.code === true },
    featured: d.featured === true,
    blurb: str(d.blurb, BLURB_MAX),
  };
}
