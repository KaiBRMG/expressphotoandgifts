import { runCheck } from "@/lib/admin/payments";
import { cronJob } from "@/lib/secure";

/** The daily check of PayFast's transaction history against the shop's orders (`lib/admin/payments.ts`), run by the host's cron. */
export const GET = (request: Request) => cronJob(request, "Checked PayFast payments", () => runCheck("daily check"));
