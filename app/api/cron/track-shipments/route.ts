import { checkShipments } from "@/lib/checkout/shipments";
import { cronJob } from "@/lib/secure";

/**
 * The daily check of courier shipments, run by the host's cron: each open
 * waybill's status read again from The Courier Guy, in case a webhook went
 * missing, and any booking left half-done flagged for staff.
 */
export const GET = (request: Request) => cronJob(request, "Checked courier shipments", checkShipments);
