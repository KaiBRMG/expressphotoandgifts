import "server-only";

import { FieldPath, FieldValue } from "firebase-admin/firestore";

import { db } from "@/lib/firebase";
import type { Beacon, FunnelDay } from "@/lib/funnel";
import { shopDate } from "@/lib/shopTime";

/** The shop's daily counters (`lib/funnel.ts`): one document a day, its ID the date. */
const days = () => db().collection("analytics");

/** Counts one beacon on today's document, in a single write: its step (once a visit), and the product or search it names. */
export async function count(b: Beacon) {
  const date = shopDate();
  const one = FieldValue.increment(1);
  const step = b.step === "miss" || !("first" in b) || b.first ? { [b.step]: one } : {};
  const named = b.step === "miss" ? { misses: { [b.q]: one } } : "slug" in b ? { [`${b.step}s`]: { [b.slug]: one } } : {};
  // Nested maps under `set` with merge take their keys as written, so a slug or a search is never read as a field path.
  await days()
    .doc(date)
    .set({ date, ...step, ...named }, { merge: true });
}

/** The days counted from `from` to `to` (YYYY-MM-DD, inclusive). */
export async function funnelDays(from: string, to: string): Promise<FunnelDay[]> {
  const snap = await days().where(FieldPath.documentId(), ">=", from).where(FieldPath.documentId(), "<=", to).get();
  return snap.docs.map((d) => d.data() as FunnelDay);
}

/** The first day anything was counted, or null before the counters ever ran. */
export async function countingSince(): Promise<string | null> {
  const snap = await days().orderBy(FieldPath.documentId()).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}
