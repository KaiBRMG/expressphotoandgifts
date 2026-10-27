import { sweepUploads } from "@/lib/checkout/uploads";
import { cronJob } from "@/lib/secure";
import { sweepPendingSubscriptions } from "@/lib/subscribers";

/** The daily sweep of customer photos (unpaid orders', and paid guest orders' after a year), and of email sign-up links nobody followed. Run by the host's cron. */
export const GET = (request: Request) =>
  cronJob(request, "Swept uploads", async () => {
    const [uploads, subscriptions] = await Promise.all([sweepUploads(), sweepPendingSubscriptions()]);
    return { ...uploads, subscriptions };
  });
