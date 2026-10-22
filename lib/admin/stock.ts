import "server-only";

import { applyEdit, MOVE_LABELS, type StockEdit, type StockLevel, type StockMove } from "@/lib/catalog/stock";
import { primaryPhoto } from "@/lib/catalog/listing";
import { variantLabel } from "@/lib/catalog/purchase";
import type { Product } from "@/lib/catalog/types";
import { db } from "@/lib/firebase";
import { levelOf, stockChanged, stockDocs, writeLevel, type StockDoc } from "@/lib/stock";
import { listProducts } from "./products";

/**
 * Stock as the Stock page reads and writes it, fresh from Firestore. Every
 * variant of every product not retired is a row, tracked or not; a change is
 * saved with a line in its SKU's history saying who made it.
 */

/** One variant on the Stock page. */
export type StockRow = {
  sku: string;
  slug: string;
  product: string;
  code: string;
  /** "A4 / Navy", or null for a product with no choices. */
  variant: string | null;
  photo: string | null;
  /** Hidden from the shop: its stock matters less, and the page says so. */
  hidden: boolean;
  level: StockLevel | null;
  updatedAt: string | null;
};

/** The stock documents by SKU: all of them, or only the tracked (the dashboard's). */
export async function readLevels({ trackedOnly = false } = {}): Promise<Map<string, StockDoc>> {
  const snap = await (trackedOnly ? stockDocs().where("tracked", "==", true) : stockDocs()).get();
  return new Map(snap.docs.map((d) => [d.id, d.data() as StockDoc]));
}

/** Every variant of every product not retired, with its level if it has one. */
export function stockRows(products: Product[], levels: Map<string, StockDoc>): StockRow[] {
  return products
    .filter((p) => p.status !== "archived")
    .flatMap((p) =>
      p.variants.map((v) => {
        const s = levels.get(v.sku);
        return {
          sku: v.sku,
          slug: p.slug,
          product: p.name,
          code: p.code,
          variant: variantLabel(p, v),
          photo: primaryPhoto(p),
          hidden: p.status !== "active",
          level: s ? { tracked: s.tracked, onHand: s.onHand, soldOutAt: s.soldOutAt, lowAt: s.lowAt } : null,
          updatedAt: s?.updatedAt ?? null,
        };
      }),
    );
}

export async function listStock(): Promise<StockRow[]> {
  const [products, levels] = await Promise.all([listProducts(), readLevels()]);
  return stockRows(products, levels);
}

export type SaveStockResult = { ok: true; levels: Record<string, StockLevel>; at: string } | { error: string; skus?: string[] };

/** The most rows saved at once: two writes each, under Firestore's 500 a transaction. */
const MAX_EDITS = 200;

const isEdit = (e: unknown): e is StockEdit => {
  const x = e as StockEdit;
  return typeof x === "object" && x !== null && typeof x.sku === "string" && x.sku.length > 0 && x.sku.length <= 80 && (x.expected === null || typeof x.expected === "number");
};

/** What a change of tracking or levels did, in the history's words. */
function notes(was: StockLevel | undefined, now: StockLevel): Pick<StockMove, "kind" | "note">[] {
  const said: Pick<StockMove, "kind" | "note">[] = [];
  if ((was?.tracked ?? false) !== now.tracked) said.push({ kind: "tracking", note: now.tracked ? "Started tracking" : "Stopped tracking; it can always be ordered" });
  if (now.tracked && was && (was.soldOutAt !== now.soldOutAt || was.lowAt !== now.lowAt)) said.push({ kind: "levels", note: `Sold out at ${now.soldOutAt}, low at ${now.lowAt}` });
  return said;
}

/**
 * Saves the page's edits, all or none, in one transaction. A typed count is
 * checked against the count the page showed (`expected`): if a sale or
 * another member of staff changed it since, nothing is saved and the rows
 * are named, to be looked at again. A delivery received adds to whatever is
 * there, so it never conflicts.
 */
export async function saveStock(raw: unknown, by: string): Promise<SaveStockResult> {
  if (!Array.isArray(raw) || raw.length === 0 || !raw.every(isEdit)) return { error: "Something went wrong reading the changes. Reload the page and try again." };
  if (raw.length > MAX_EDITS) return { error: `Save up to ${MAX_EDITS} rows at a time.` };
  const edits = raw as StockEdit[];
  if (new Set(edits.map((e) => e.sku)).size !== edits.length) return { error: "A row was sent twice. Reload the page and try again." };

  let soldOutChanged = false;
  const result = await db().runTransaction(async (tx): Promise<SaveStockResult> => {
    soldOutChanged = false;
    const snaps = await tx.getAll(...edits.map((e) => stockDocs().doc(e.sku)));
    const at = new Date().toISOString();
    const made: { e: StockEdit; was: StockDoc | undefined; level: StockLevel }[] = [];
    const moved: string[] = [];

    for (const [i, e] of edits.entries()) {
      const was = levelOf(snaps[i]);
      if (e.count !== undefined && (was?.onHand ?? 0) !== (e.expected ?? 0)) moved.push(e.sku);
      const r = applyEdit(was, e);
      if ("error" in r) return { error: `${e.sku}: ${r.error}`, skus: [e.sku] };
      made.push({ e, was, level: r.level });
    }
    if (moved.length) {
      return {
        error: `${moved.length === 1 ? `${moved[0]} has` : `${moved.length} rows have`} changed since you opened the page (a sale, or someone else’s count). Nothing was saved. Check the new ${moved.length === 1 ? "count" : "counts"}, then count again.`,
        skus: moved,
      };
    }

    for (const { e, was, level } of made) {
      const ref = stockDocs().doc(e.sku);
      const change = level.onHand - (was?.onHand ?? 0);
      const base = { at, by, onHand: level.onHand };
      const lines: StockMove[] = notes(was, level).map((n) => ({ ...base, ...n, change: 0 }));
      if (e.receive !== undefined) lines.unshift({ ...base, kind: "received", change });
      else if (e.count !== undefined && (change !== 0 || !was?.tracked)) lines.unshift({ ...base, kind: "counted", change });
      // The first line goes with the write; any more are their own lines of history.
      const [first, ...rest] = lines.length ? lines : [{ ...base, kind: "levels" as const, change: 0 }];
      soldOutChanged ||= writeLevel(tx, ref, was, level, first).soldOutChanged;
      for (const m of rest) tx.create(ref.collection("moves").doc(), m);
    }
    return { ok: true, at, levels: Object.fromEntries(made.map(({ e, level }) => [e.sku, level])) };
  });
  if ("ok" in result) stockChanged(soldOutChanged);
  return result;
}

/** A SKU's history, newest first, as the page shows it. */
export type HistoryLine = StockMove & { label: string };

export async function stockHistory(sku: string): Promise<HistoryLine[]> {
  if (typeof sku !== "string" || !sku || sku.length > 80) return [];
  const snap = await stockDocs().doc(sku).collection("moves").orderBy("at", "desc").limit(40).get();
  return snap.docs.map((d) => {
    const m = d.data() as StockMove;
    return { ...m, label: MOVE_LABELS[m.kind] ?? m.kind };
  });
}
