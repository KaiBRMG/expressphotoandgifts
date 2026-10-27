"use client";

import { useState } from "react";
import { Button, Textarea } from "@mantine/core";
import { reviewPaymentAction } from "@/app/admin/actions";
import { NOTE_MAX } from "@/lib/checkout/order";
import { useOrderAction } from "../orders/[ref]/OrderActions";

/** Marks an exception as looked at, with what was done, so the page and the dashboard stop counting it. */
export function ReviewPayment({ month, k }: { month: string; k: string }) {
  const { pending, error, run } = useOrderAction();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!open)
    return (
      <Button variant="default" size="xs" className="ledger__review" onClick={() => setOpen(true)}>
        Mark as looked at
      </Button>
    );
  return (
    <form
      className="oform ledger__review"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => reviewPaymentAction(month, k, note));
      }}
    >
      <Textarea label="What was done" placeholder="Refunded the second payment in PayFast" autosize minRows={2} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.currentTarget.value)} required />
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="row">
        <Button type="submit" size="xs" loading={pending}>
          Save
        </Button>
        <Button variant="subtle" size="xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
