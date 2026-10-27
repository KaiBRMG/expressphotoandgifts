import { NextResponse, type NextRequest } from "next/server";

/** Sends the browser to `/subscription` with what happened (`s`); 303 after a POST so the browser follows it with a GET. */
export function landing(request: NextRequest, s: string, status: 302 | 303 = 302) {
  const to = new URL("/subscription", request.nextUrl.origin);
  to.searchParams.set("s", s);
  return NextResponse.redirect(to, status);
}
