import { NextResponse, type NextRequest } from "next/server";

import { finishEmailCheck } from "@/lib/account/auth";

/**
 * The link in the account's "Find your earlier orders" email: proves the
 * address, brings in its orders, and lands on the account page saying what
 * happened. The token is the proof, so it works from any browser, signed in
 * or not; a second visit finds it used and says so.
 */
export async function GET(request: NextRequest) {
  const u = request.nextUrl.searchParams.get("u") ?? "";
  const t = request.nextUrl.searchParams.get("t") ?? "";
  const done = await finishEmailCheck(u, t).catch((e) => {
    console.error("Email check failed", e);
    return { error: "invalid" as const };
  });
  const to = new URL("/account", request.nextUrl.origin);
  if ("error" in done) to.searchParams.set("check", done.error);
  else to.searchParams.set("claimed", String(done.claimed));
  return NextResponse.redirect(to, { headers: { "Referrer-Policy": "no-referrer" } });
}
