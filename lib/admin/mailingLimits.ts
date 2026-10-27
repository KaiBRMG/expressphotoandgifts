import type { Phase } from "@/lib/catalog/campaigns";

/** How long a marketing email's subject and message may be; shared by the dialog and the server, which checks again. */
export const MAILING_LIMITS = { subject: 150, message: 5000 } as const;

/** A campaign an email can promote, as the dialog's picker lists it. */
export type EmailableCampaign = { id: string; name: string; phase: Extract<Phase, "live" | "scheduled">; startsAt: string | null; endsAt: string | null; /** Needs a one-time code: each email carries the customer's own. */ code: boolean };
