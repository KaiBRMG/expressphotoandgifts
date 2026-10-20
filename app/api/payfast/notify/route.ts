import { after } from "next/server";

import { readNotice } from "@/lib/checkout/payfast";
import { applyNotice } from "@/lib/checkout/orders";
import { afterPaid } from "@/lib/checkout/paid";
import { callerIp } from "@/lib/rateLimit";

/**
 * PayFast's payment notice (ITN). An order is paid only when the notice
 * passes all four of PayFast's checks: signature, source, amount and
 * PayFast's own confirmation. A notice that fails one is never acted on. If
 * its signature held (so PayFast sent it), it is recorded and its order
 * flagged for the shop; if not, it is only logged, since anyone can post here.
 *
 * PayFast resends until it gets a 200, so every outcome we have dealt with
 * answers 200, and only our own failures (Firestore, PayFast unreachable)
 * answer with an error, to have it sent again. The emails go after the
 * answer, so PayFast isn't kept waiting on them.
 */
export async function POST(request: Request) {
  const read = await readNotice(await request.text(), callerIp(request));
  if (!read.ok) console.error("PayFast notice refused:", read.reason, read.signed ? read.notice.attempt : "");
  if (!read.ok && !read.signed) return new Response("OK");
  if (!read.ok && read.retry) return new Response("Try again", { status: 503 });

  try {
    const applied = await applyNotice(read.notice, read.ok ? undefined : read.reason);
    if (applied.outcome === "paid") after(() => afterPaid(applied.order));
    else if (applied.outcome !== "already") console.error("PayFast notice", read.notice.attempt, read.notice.pfPaymentId, applied.outcome);
    return new Response("OK");
  } catch (e) {
    console.error("PayFast notice not saved", e);
    return new Response("Try again", { status: 500 });
  }
}
