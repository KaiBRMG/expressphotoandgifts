"use client";

import { useState, useTransition } from "react";
import { Button, Modal, SegmentedControl, Select, Textarea, TextInput } from "@mantine/core";
import { MAILING_LIMITS, type EmailableCampaign } from "@/lib/admin/mailingLimits";
import { Mail } from "@/app/site/icons";
import { emailAllCustomersAction, emailPreviewAction, emailTestAction } from "../../actions";

const people = (n: number) => `${n} ${n === 1 ? "customer" : "customers"}`;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });

/** "Live, ends 2 Nov", "Starts 30 Oct", "Live": where a campaign is, in the picker. */
const status = (c: EmailableCampaign) => (c.phase === "scheduled" && c.startsAt ? `Starts ${day(c.startsAt)}` : c.endsAt ? `Live, ends ${day(c.endsAt)}` : "Live");

/**
 * The Customers page's Email all: a subject and a message to every customer
 * who agreed to marketing email, and optionally a campaign, whose deals,
 * dates and product photos the server adds from the campaign as it stands
 * when the email is made. The count is what the list holds now; the server
 * reads the list again when it sends. Preview shows the email as customers
 * will get it, a test goes to the signed-in staff member first, and the send's
 * id is made when the window opens so a double press can't email anyone twice.
 */
export function EmailAll({ count, campaigns }: { count: number; campaigns: EmailableCampaign[] }) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const [testing, startTest] = useTransition();
  const [previewing, startPreview] = useTransition();

  const picked = campaigns.find((c) => c.id === campaignId) ?? null;

  const show = () => {
    setId(crypto.randomUUID());
    setCampaignId(null);
    setSubject("");
    setMessage("");
    setTab("write");
    setHtml(null);
    setError(null);
    setNote(null);
    setDone(null);
    setOpen(true);
  };
  const busy = sending || testing;
  const ready = subject.trim() !== "" && (message.trim() !== "" || picked !== null);

  // A subject left empty, or still the last campaign's name, follows the campaign chosen.
  const choose = (next: string | null) => {
    const c = campaigns.find((x) => x.id === next) ?? null;
    if (!subject.trim() || subject === picked?.name) setSubject(c?.name ?? "");
    setCampaignId(next);
    setNote(null);
    setError(null);
  };

  const view = (next: string) => {
    setTab(next as typeof tab);
    if (next !== "preview") return;
    setError(null);
    setHtml(null);
    startPreview(async () => {
      const res = await emailPreviewAction(subject, message, campaignId);
      if ("error" in res) {
        setError(res.error);
        setTab("write");
      } else setHtml(res.html);
    });
  };

  const send = () =>
    startSend(async () => {
      setError(null);
      setNote(null);
      const res = await emailAllCustomersAction(id, subject, message, campaignId);
      if (!("ok" in res)) return setError(res.error);
      setDone(`Sent to ${people(res.sent)}${res.coded ? `, each with their own one-time code` : ""}.${res.failed ? ` ${res.failed} didn’t go: ${res.error ?? "Resend refused them"}.` : ""}`);
    });

  const test = () =>
    startTest(async () => {
      setError(null);
      setNote(null);
      const res = await emailTestAction(subject, message, campaignId);
      if (!("ok" in res)) return setError(res.error);
      setNote(res.coded ? "A test is on its way to your own email. Its code is real: use it at checkout to try the deal, once." : "A test is on its way to your own email.");
    });

  return (
    <>
      <button type="button" className="obtn" onClick={show}>
        <Mail size={18} />
        Email all
      </button>

      <Modal opened={open} onClose={() => !busy && setOpen(false)} title="Email all" centered radius="lg" size="xl" closeOnClickOutside={!busy}>
        {done ? (
          <div className="stack">
            <p role="status">{done}</p>
            <div className="confirm__actions">
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <p>
              {count === 0
                ? "No customer has agreed to marketing email yet, so there is no one to send this to."
                : `Goes to ${people(count)} who agreed to marketing email for specials and campaigns, each as their own email. It says why they got it and links to their account to turn it off.`}
            </p>

            <SegmentedControl aria-label="Email" value={tab} onChange={view} data={[{ value: "write", label: "Write" }, { value: "preview", label: "Preview" }]} disabled={!ready} />

            {tab === "write" ? (
              <>
                <Select
                  label="Campaign"
                  description={
                    campaigns.length
                      ? "Adds its deals, when it runs and photos of its products, as they stand when the email is sent."
                      : "Live and scheduled campaigns appear here. There are none right now, so the email is your message alone."
                  }
                  placeholder="No campaign"
                  data={campaigns.map((c) => ({ value: c.id, label: `${c.name} (${status(c)})` }))}
                  value={campaignId}
                  onChange={choose}
                  disabled={campaigns.length === 0}
                  clearable
                  searchable
                />
                {picked ? (
                  <p className="hint" role="status">
                    {picked.code
                      ? "This deal needs a code. Every customer gets their own single-use code, made when you press Send and written in their email with the words to enter it at checkout. It works once, on one order, and the deal isn’t on the shop without it."
                      : "No codes: this deal is on the shop for everyone, so the email links to it. To send a one-time code instead, switch on “Needs a one-time code” in the campaign’s limits."}
                  </p>
                ) : null}
                <TextInput label="Subject" value={subject} onChange={(e) => setSubject(e.currentTarget.value)} maxLength={MAILING_LIMITS.subject} data-autofocus />
                <Textarea
                  label={picked ? "Message (optional)" : "Message"}
                  description={picked ? "Goes above the campaign. A blank line starts a new paragraph." : "A blank line starts a new paragraph. A Shop now button is added under it."}
                  value={message}
                  onChange={(e) => setMessage(e.currentTarget.value)}
                  maxLength={MAILING_LIMITS.message}
                  minRows={picked ? 4 : 8}
                  autosize
                />
              </>
            ) : previewing || html === null ? (
              <p role="status" className="hint">
                Making the preview…
              </p>
            ) : (
              <iframe className="mailprev" title="The email as customers will get it" sandbox="" srcDoc={html} />
            )}

            {error ? (
              <p className="hint" role="alert">
                {error}
              </p>
            ) : null}
            {note ? <p role="status">{note}</p> : null}
            <div className="confirm__actions">
              <Button variant="subtle" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="default" onClick={test} loading={testing} disabled={!ready || sending}>
                Send me a test
              </Button>
              <Button onClick={send} loading={sending} disabled={!ready || count === 0 || testing}>
                {count ? `Send to ${people(count)}` : "Send"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
