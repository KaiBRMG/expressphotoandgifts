import "server-only";

import { rands } from "@/lib/catalog/listing";
import { billingSince, listShipments, type Charge, type Direction, type Listed } from "@/lib/checkout/courier";
import type { Order } from "@/lib/checkout/order";
import { orders } from "@/lib/checkout/orders";
import { db } from "@/lib/firebase";
import { monthRange } from "./payments";

/**
 * The Courier Guy's own record of a month: every waybill the account made
 * (here or in TCG's portal), each beside the order it carried and what TCG
 * has charged for it since (charges less reversals, from its billing), so
 * what the shop paid the courier can be set against what customers paid for
 * delivery. Anything that doesn't add up comes first.
 */

/** A waybill's reference as the shop books it: the order's ref, with "-R" on a return. */
const REFERENCE = /^(EPG-[A-Z0-9]{6})(-R)?$/;

/** What a row needs, in the shop's words: the problem and what to do. */
export type Problem = { text: string; fix: string };

export type CourierRow = {
  waybill: Listed;
  direction: Direction;
  order: { ref: string; name: string; paid: number | null } | null;
  /** What TCG has charged for this waybill, cents: its charges less their reversals. Null when its billing couldn't be read. */
  charged: number | null;
  problem: Problem | null;
};

export type CourierLedger = {
  rows: CourierRow[];
  /** Totals over the waybills that carried an order out: TCG's charges and what customers paid for delivery. */
  charged: number;
  paid: number;
  exceptions: number;
  /** False when TCG's billing couldn't be read: charges are then TCG's booking rates, unconfirmed. */
  billed: boolean;
};

type Found = Pick<Order, "contact" | "delivery" | "shipment" | "returnShipment">;

function problemOf(row: Omit<CourierRow, "problem">, o: Found | null): Problem | null {
  const cancelled = row.waybill.status === "cancelled";
  if (!row.order || !o) {
    if (cancelled && !row.charged) return null;
    return { text: "Not from an order", fix: "Booked in TCG’s portal, or for an order the shop doesn’t have. Check it’s the shop’s." };
  }
  const kept = row.direction === "return" ? o.returnShipment : o.shipment;
  if (kept?.id !== row.waybill.id && !cancelled) {
    return { text: "An extra waybill for this order", fix: `The order’s waybill is ${kept?.tracking ?? "another"}. Cancel this one in TCG’s portal if it isn’t needed.` };
  }
  if (cancelled && row.charged) {
    return { text: "Cancelled, but still charged", fix: "TCG reverses a charge only before it collects. Ask TCG if it never collected." };
  }
  if (row.direction === "out" && row.charged !== null && row.order.paid !== null && row.charged > row.order.paid) {
    return {
      text: `${rands(row.charged - row.order.paid)} more than the customer paid`,
      fix: "Extras at booking, more or bigger boxes, or TCG re-measured it at its hub. The shop carries the difference.",
    };
  }
  return null;
}

/** A month's waybills and their charges, read live from TCG and matched to the shop's orders. */
export async function courierMonth(month: string): Promise<{ ok: true; data: CourierLedger } | { ok: false; message: string }> {
  const range = monthRange(month);
  const from = new Date(`${range.from}T00:00:00+02:00`);
  const until = new Date(`${range.to}T23:59:59+02:00`);
  const [waybills, billing] = await Promise.all([listShipments(from, until), billingSince(from)]);
  if (!waybills) return { ok: false, message: "The Courier Guy’s list of waybills couldn’t be read. Check that its API key can read shipments." };

  // What each waybill has cost, from TCG's billing: charges are negative there, reversals positive.
  const charges = new Map<number, number>();
  for (const c of billing ?? ([] as Charge[])) if (c.shipmentId) charges.set(c.shipmentId, (charges.get(c.shipmentId) ?? 0) - c.amount);

  const refs = [...new Set(waybills.map((w) => REFERENCE.exec(w.reference)?.[1]).filter((r): r is string => !!r))];
  const docs = refs.length ? await db().getAll(...refs.map((r) => orders().doc(r)), { fieldMask: ["contact", "delivery", "shipment", "returnShipment"] }) : [];
  const found = new Map(docs.filter((d) => d.exists).map((d) => [d.id, d.data() as Found]));

  const rows = waybills.map((waybill): CourierRow => {
    const match = REFERENCE.exec(waybill.reference);
    const direction: Direction = match?.[2] || waybill.isReturn ? "return" : "out";
    const o = match ? (found.get(match[1]) ?? null) : null;
    const base = {
      waybill,
      direction,
      order: o && match ? { ref: match[1], name: `${o.contact.firstName} ${o.contact.lastName}`, paid: direction === "out" ? o.delivery : null } : null,
      charged: billing ? (charges.get(waybill.id) ?? 0) : (waybill.rate ?? null),
    };
    return { ...base, problem: problemOf(base, o) };
  });

  // Exceptions first, then newest first.
  rows.sort((a, b) => Number(!!b.problem) - Number(!!a.problem) || b.waybill.created.localeCompare(a.waybill.created));
  const carried = rows.filter((r) => r.direction === "out" && r.order && r.waybill.status !== "cancelled");
  return {
    ok: true,
    data: {
      rows,
      charged: rows.reduce((n, r) => n + (r.charged ?? 0), 0),
      paid: carried.reduce((n, r) => n + (r.order?.paid ?? 0), 0),
      exceptions: rows.filter((r) => r.problem).length,
      billed: billing !== null,
    },
  };
}
