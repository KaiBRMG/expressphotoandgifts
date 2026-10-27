import "server-only";

/**
 * Email through Resend (resend.com/docs/api-reference/emails/send-email).
 *
 * Settings: RESEND_API_KEY, and EMAIL_FROM, the sender as Resend has verified
 * its domain ("Express Photo and Gifts <noreply@orders.expressphotoandgifts.com>").
 * Without them nothing is sent, and the caller is told why.
 */

export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Extra headers, e.g. the List-Unsubscribe pair a marketing email carries. */
  headers?: Record<string, string>;
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
        to: Array.isArray(mail.to) ? mail.to : [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
        ...(mail.headers ? { headers: mail.headers } : {}),
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

/** Resend takes up to 100 emails in a batch call. */
const BATCH = 100;

/**
 * Many emails, each to its own recipient, in as few Resend calls as it takes
 * (resend.com/docs/api-reference/emails/send-batch-emails: up to 100 a call).
 * `key` makes the whole send idempotent for 24 hours: a retry with the same
 * key and the same emails returns what the first call did instead of sending
 * again. Says how many went, and why any did not; a refused call sends none of
 * its chunk, and the chunks after it are still tried.
 */
export async function sendBatch(mails: Omit<Mail, "key">[], key: string): Promise<{ sent: number; failed: number; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return { sent: 0, failed: mails.length, error: "Email isn’t set up (RESEND_API_KEY and EMAIL_FROM)." };
  let sent = 0;
  let error: string | undefined;
  for (let i = 0; i < mails.length; i += BATCH) {
    const chunk = mails.slice(i, i + BATCH);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${key}/${i / BATCH}`.slice(0, 256) },
        body: JSON.stringify(
          chunk.map((m) => ({ from, to: Array.isArray(m.to) ? m.to : [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}), ...(m.headers ? { headers: m.headers } : {}) })),
        ),
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) sent += chunk.length;
      else error ??= `Resend refused it (${res.status}): ${(await res.text().catch(() => "")).slice(0, 300)}`;
    } catch (e) {
      console.error("Resend unreachable", e);
      error ??= "Resend couldn’t be reached.";
    }
  }
  return { sent, failed: mails.length - sent, ...(error ? { error } : {}) };
}

/** Text made safe to put in HTML. Everything a customer typed goes through it. */
export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
