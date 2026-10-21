import { sweepUnpaidUploads } from "@/lib/checkout/uploads";
import { cronJob } from "@/lib/secure";

/** The daily sweep of unpaid orders' photos, run by the host's cron. */
export const GET = (request: Request) => cronJob(request, "Swept unpaid uploads", sweepUnpaidUploads);
