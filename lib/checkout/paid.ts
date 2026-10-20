import "server-only";

import { detailsFrom, saveDetails } from "@/lib/account/auth";
import { orderEmails } from "./emails";
import type { Order } from "./order";
import { orders } from "./orders";

/**
 * What follows a paid order, once PayFast has its answer (`after()` in the
 * notice route): its details saved to the customer's account when it has
 * one, and its two emails sent, with whether each went noted on the order.
 */
export async function afterPaid(order: Order): Promise<void> {
  const [, sent] = await Promise.all([
    order.uid ? saveDetails(order.uid, detailsFrom(order)).catch((e) => console.error("Details not saved", order.ref, e)) : null,
    orderEmails(order),
  ]);
  const update = Object.fromEntries(Object.entries(sent).map(([who, s]) => [`emails.${who}`, s]));
  await orders()
    .doc(order.ref)
    .update(update)
    .catch((e) => console.error("Email record not saved", order.ref, e));
}
