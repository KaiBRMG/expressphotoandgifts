"use client";

import { useState, useTransition } from "react";
import { Button, TagsInput } from "@mantine/core";
import { saveOrderRecipientsAction } from "@/app/admin/actions";
import { isEmail } from "@/lib/checkout/details";
import { MAX_RECIPIENTS } from "@/lib/settings-shared";

/** Who the shop's new-order email goes to: add addresses, remove them, or leave none. */
export function OrderRecipients({ initial }: { initial: string[] }) {
  const [emails, setEmails] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const changed = emails.join("\n") !== saved.join("\n");

  return (
    <form
      className="oform form-narrow"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setDone(false);
        start(async () => {
          const res = await saveOrderRecipientsAction(emails).catch(() => ({ error: "That didn’t reach the server. Check the connection and try again." }));
          if ("error" in res) return setError(res.error);
          setEmails(res.emails);
          setSaved(res.emails);
          setDone(true);
        });
      }}
    >
      <TagsInput
        label="New orders are emailed to"
        description="Each time an order is paid, the shop gets an email with its details and a link to its photos. Type an address and press Enter to add it, or remove them all to turn the email off."
        placeholder={emails.length ? "Add another address" : "No one: new orders aren’t emailed"}
        type="email"
        inputMode="email"
        splitChars={[",", " ", ";"]}
        maxTags={MAX_RECIPIENTS}
        value={emails}
        onChange={(v) => {
          const bad = v.find((e) => !isEmail(e));
          setError(bad ? `“${bad}” doesn’t look like an email address.` : null);
          setEmails(v.filter((e) => isEmail(e)).map((e) => e.trim().toLowerCase()));
          setDone(false);
        }}
        error={error}
      />
      {emails.length === 0 ? <p className="osec__soft">With no address, nothing is emailed when an order is paid. You can still find every order under Orders.</p> : null}
      <div className="row">
        <Button type="submit" loading={pending} disabled={!changed}>
          Save
        </Button>
        {done ? <p className="osec__soft" role="status">Saved.</p> : null}
      </div>
    </form>
  );
}
