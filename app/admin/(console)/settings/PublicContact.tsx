"use client";

import { useState, useTransition } from "react";
import { Button, TextInput } from "@mantine/core";
import { saveShopContactAction } from "@/app/admin/actions";
import type { ContactInput } from "@/lib/contact";

/** The email and mobile number the public reaches the shop on, wherever the site states them. */
export function PublicContact({ initial }: { initial: ContactInput }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<{ field?: keyof ContactInput; message: string } | null>(null);
  const [done, setDone] = useState(false);
  const changed = form.email !== saved.email || form.phone !== saved.phone;
  const set = (patch: Partial<ContactInput>) => {
    setForm({ ...form, ...patch });
    setError(null);
    setDone(false);
  };

  return (
    <form
      className="oform form-narrow"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setDone(false);
        start(async () => {
          const res = await saveShopContactAction(form).catch(() => ({ error: "That didn’t reach the server. Check the connection and try again.", field: undefined }));
          if ("error" in res) return setError({ field: res.field, message: res.error });
          setForm(res.input);
          setSaved(res.input);
          setDone(true);
        });
      }}
    >
      <TextInput
        label="Email customers can reach the shop on"
        description="Shown in the footer, the terms and privacy policy, order emails and the printed receipt. Replies to order emails come here, and PayFast sends its payment confirmations here."
        type="email"
        inputMode="email"
        autoComplete="off"
        maxLength={100}
        value={form.email}
        onChange={(e) => set({ email: e.currentTarget.value })}
        error={error?.field === "email" ? error.message : undefined}
        required
      />
      <TextInput
        label="Mobile number customers can reach the shop on"
        description="Shown in the footer, the policies, order emails, the receipt and the order tracking page. It is also the WhatsApp number behind every “Ask on WhatsApp” and chat button, and the shop’s contact on a courier waybill."
        type="tel"
        inputMode="tel"
        autoComplete="off"
        placeholder="076 491 2300"
        maxLength={20}
        value={form.phone}
        onChange={(e) => set({ phone: e.currentTarget.value })}
        error={error?.field === "phone" ? error.message : undefined}
        required
      />
      {error && !error.field ? (
        <p className="admin-error" role="alert">
          {error.message}
        </p>
      ) : null}
      <div className="row">
        <Button type="submit" loading={pending} disabled={!changed}>
          Save
        </Button>
        {done ? <p className="osec__soft" role="status">Saved. The shop shows these from now on; emails already sent keep what they said.</p> : null}
      </div>
    </form>
  );
}
