import { randomBytes } from "node:crypto";

import { REF } from "@/lib/checkout/order";
import { cloudinaryReady, uploadTicket } from "@/lib/cloudinary";
import { callerIp, rateLimit } from "@/lib/rateLimit";

/**
 * Signs one customer photo upload, so it goes straight from the browser to
 * Cloudinary without the secret leaving the server. The signature names the
 * file itself (`orders/<ref>/<random>`), so it lets exactly one photograph in:
 * used again it replaces that file, never adds another. Formats are held to
 * photographs; Cloudinary's free plan refuses anything over 10 MB. The
 * `checkout` tag is what the daily sweep of unpaid orders lists by.
 */
const FORMATS = "jpg,jpeg,png,webp,heic,heif";

/**
 * Far past a real order (48 photos on the largest product, each edit a file
 * of its own), and short of filling the free plan's storage from one address.
 */
const allowed = rateLimit(300, 60 * 60 * 1000);

export async function POST(request: Request) {
  if (!cloudinaryReady()) return Response.json({ error: "Uploads are not set up." }, { status: 503 });

  const { ref } = (await request.json().catch(() => ({}))) as { ref?: unknown };
  if (typeof ref !== "string" || !REF.test(ref)) return Response.json({ error: "Bad order reference." }, { status: 400 });
  if (!allowed(callerIp(request) ?? "unknown")) {
    return Response.json({ error: "That’s a lot of photos at once. Wait a little, then try again." }, { status: 429 });
  }

  return Response.json(
    uploadTicket({
      allowed_formats: FORMATS,
      // The account uses dynamic folders: where the Media Library files it, apart from its ID.
      asset_folder: `orders/${ref}`,
      public_id: `orders/${ref}/${randomBytes(8).toString("hex")}`,
      tags: "checkout",
    }),
  );
}
