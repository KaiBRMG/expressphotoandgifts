import type { NextRequest } from "next/server";

import { confirmSubscription } from "@/lib/subscribers";
import { landing } from "../landing";

/**
 * The link in the footer sign-up's "Is this your email?" email. The token is
 * the proof, so it works from any browser; a second visit finds it used and
 * says so on the page it lands on.
 */
export async function GET(request: NextRequest) {
  const e = request.nextUrl.searchParams.get("e") ?? "";
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const result = await confirmSubscription(e, t).catch((err) => {
    console.error("Subscription not confirmed", err);
    return "invalid" as const;
  });
  return landing(request, result === "ok" ? "on" : result);
}
