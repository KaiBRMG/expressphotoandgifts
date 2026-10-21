import type { PayfastStatus } from "@/lib/checkout/payfastApi";
import { Alert } from "@/app/site/icons";

/** What PayFast's status page reports as wrong, said once, on the dashboard and the Payments page. Nothing when all is well. */
export function PayfastStatusNotice({ status }: { status: PayfastStatus | null }) {
  if (!status) return null;
  const what = status.incidents.length ? `“${status.incidents.join("”, “")}”` : "a problem";
  const where = status.degraded.length ? `: ${status.degraded.map((d) => `${d.name}, ${d.status}`).join("; ")}` : "";
  return (
    <p className="pay__status" role="status">
      <Alert size={18} />
      <span>
        PayFast reports {what}
        {where}. Customers paying that way may not get through.
      </span>
    </p>
  );
}
