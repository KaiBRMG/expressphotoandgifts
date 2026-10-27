import { NextResponse, type NextRequest } from "next/server";

import { withdrawMarketing } from "@/lib/subscribers";
import { validUnsubscribe } from "@/lib/unsubscribe";
import { landing } from "../landing";

/**
 * Stops marketing email to the address in the link, which is signed for it.
 * Two callers post here: the "Stop these emails" button on /subscription, and a
 * mail client's own Unsubscribe button (RFC 8058 one-click, which posts
 * `List-Unsubscribe=One-Click` and expects a plain 200). It is POST only, so a
 * mail scanner that opens every link in a message can't unsubscribe anyone.
 */
export async function POST(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("e") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const oneClick = (await request.text().catch(() => "")).includes("List-Unsubscribe=One-Click");
  const reply = (status: number, text: string, s: string) => (oneClick ? new NextResponse(text, { status }) : landing(request, s, 303));

  if (!validUnsubscribe(email, token)) return reply(400, "Invalid link", "invalid");
  try {
    await withdrawMarketing(email.trim().toLowerCase(), "email");
  } catch (e) {
    console.error("Unsubscribe failed", e);
    return reply(500, "Try again", "failed");
  }
  return reply(200, "Unsubscribed", "off");
}
