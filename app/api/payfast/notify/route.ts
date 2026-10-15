import { amountMatches, readNotice } from "@/lib/checkout/payfast";
import { applyNotice, flagOrder } from "@/lib/checkout/orders";

/**
 * PayFast's payment notice (ITN). An order is paid only when the notice
 * passes all four of PayFast's checks: signature, source, amount and
 * PayFast's own confirmation. A notice that fails one is never acted on; the
 * order is flagged for the shop and PayFast is told it arrived.
 *
 * PayFast resends until it gets a 200, so every outcome we have dealt with
 * answers 200, and only our own failures (Firestore, PayFast unreachable)
 * answer with an error, to have it sent again.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const read = await readNotice(body, ip);
  if (!read.ok) {
    console.error("PayFast notice refused:", read.reason, read.ref ?? "");
    if (read.retry) return new Response("Try again", { status: 503 });
    if (read.ref) await flagOrder(read.ref, `Payment notice refused: ${read.reason}`);
    return new Response("OK");
  }

  try {
    const outcome = await applyNotice(read.notice, amountMatches);
    if (outcome !== "paid" && outcome !== "already") console.error("PayFast notice for", read.notice.ref, outcome, read.notice.status);
    return new Response("OK");
  } catch (e) {
    console.error("PayFast notice not saved", e);
    return new Response("Try again", { status: 500 });
  }
}
