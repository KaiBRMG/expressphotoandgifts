"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, NumberInput, SegmentedControl, Select, Textarea } from "@mantine/core";
import type { OrderActionResult } from "@/lib/admin/orders";
import { rands } from "@/lib/catalog/listing";
import { NOTE_MAX, STAGES, stageLabel, type Fulfilment, type OrderStage } from "@/lib/checkout/order";
import { recordRefundAction, resendOrderEmailAction, resolveOrderIssuesAction, setOrderStageAction } from "@/app/admin/actions";

/** Runs an order action, then redraws the page from the server; holds its error until the next try. */
function useOrderAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (call: () => Promise<OrderActionResult>, then?: () => void) =>
    start(async () => {
      setError(null);
      const done = await call().catch(() => ({ error: "That didn’t reach the server. Check the connection and try again." }));
      if ("error" in done) return setError(done.error);
      then?.();
      router.refresh();
    });
  return { pending, error, run };
}

/** Where the order is in the shop, as one control: pressing a stage moves it there. */
export function StageControl({ ref_, stage, method }: { ref_: string; stage: OrderStage; method: Fulfilment["method"] }) {
  const { pending, error, run } = useOrderAction();
  const data = STAGES.map((s) => ({ value: s, label: stageLabel(s, method) }));
  const move = (next: string | null) => {
    if (next && next !== stage) run(() => setOrderStageAction(ref_, next));
  };
  return (
    <div className="ostage">
      <SegmentedControl className="plist__status" aria-label="Stage" data={data} value={stage} onChange={move} disabled={pending} />
      <Select className="plist__statusSelect" aria-label="Stage" data={data} value={stage} onChange={move} allowDeselect={false} disabled={pending} />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
    </div>
  );
}

/** Records a refund already made in PayFast's dashboard: how much, and why. */
export function RecordRefund({ ref_, left }: { ref_: string; left: number }) {
  const { pending, error, run } = useOrderAction();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string | number>("");
  const [note, setNote] = useState("");

  if (!open) {
    return (
      <button type="button" className="admin-link osec__more" onClick={() => setOpen(true)}>
        Record a refund
      </button>
    );
  }

  const cents = amount === "" ? NaN : Math.round(Number(amount) * 100);
  return (
    <form
      className="oform"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => recordRefundAction(ref_, cents, note),
          () => {
            setOpen(false);
            setAmount("");
            setNote("");
          },
        );
      }}
    >
      <p className="hint">Make the refund in your PayFast dashboard first, then record it here so the order shows it. Up to {rands(left)} is left to refund.</p>
      <NumberInput label="Amount refunded" leftSection="R" decimalScale={2} min={0} max={left / 100} value={amount} onChange={setAmount} required />
      <Textarea label="Why" autosize minRows={2} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.currentTarget.value)} required />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="row">
        <Button type="submit" loading={pending}>
          Record refund
        </Button>
        <Button variant="subtle" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Marks the order's issues as looked at, with what was done. */
export function ResolveIssues({ ref_ }: { ref_: string }) {
  const { pending, error, run } = useOrderAction();
  const [note, setNote] = useState("");
  return (
    <form
      className="oform"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => resolveOrderIssuesAction(ref_, note));
      }}
    >
      <Textarea
        label="What was done"
        description="Check the payment in your PayFast dashboard first. Say what you found and did, such as a refund made."
        autosize
        minRows={2}
        maxLength={NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        required
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="row">
        <Button type="submit" variant="light" loading={pending}>
          Mark as looked at
        </Button>
      </div>
    </form>
  );
}

/** Sends one of the order's emails again. */
export function ResendEmail({ ref_, who }: { ref_: string; who: "shop" | "customer" }) {
  const { pending, error, run } = useOrderAction();
  return (
    <span className="oresend">
      <button type="button" className="admin-link" disabled={pending} onClick={() => run(() => resendOrderEmailAction(ref_, who))}>
        {pending ? "Sending…" : "Send again"}
      </button>
      {error ? <span className="admin-error" role="alert">{error}</span> : null}
    </span>
  );
}
