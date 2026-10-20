import "server-only";

/**
 * Email through Resend (resend.com/docs/api-reference/emails/send-email).
 *
 * Settings: RESEND_API_KEY, and EMAIL_FROM, the sender as Resend has verified
 * its domain ("Express Photo and Gifts <orders@expressphotoandgifts.com>").
 * Without them nothing is sent, and the caller is told why.
 */

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Resend sends one email per key for 24 hours, so a retried call can't send it twice. */
  key: string;
};

export async function sendEmail(mail: Mail): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return { ok: false, error: "Email isn’t set up (RESEND_API_KEY and EMAIL_FROM)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": mail.key.slice(0, 256) },
      body: JSON.stringify({
        from,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, error: `Resend refused it (${res.status}): ${(await res.text().catch(() => "")).slice(0, 300)}` };
    return { ok: true };
  } catch (e) {
    console.error("Resend unreachable", e);
    return { ok: false, error: "Resend couldn’t be reached." };
  }
}

/** Text made safe to put in HTML. Everything a customer typed goes through it. */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
