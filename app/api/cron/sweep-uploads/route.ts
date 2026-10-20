import { sweepUnpaidUploads } from "@/lib/checkout/uploads";

/**
 * The daily sweep of unpaid orders' photos, called by the host's cron
 * (`vercel.json`), which sends `Authorization: Bearer <CRON_SECRET>`. Without
 * CRON_SECRET set, nothing can run it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET is not set", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  try {
    const swept = await sweepUnpaidUploads();
    console.log("Swept unpaid uploads", swept);
    return Response.json(swept);
  } catch (e) {
    console.error("Upload sweep failed", e);
    return new Response("Sweep failed", { status: 500 });
  }
}
