"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, NumberInput, SegmentedControl, Select, Textarea } from "@mantine/core";
import type { OrderEmail } from "@/lib/checkout/emails";
import { rands } from "@/lib/catalog/listing";
import { NOTE_MAX, STAGES, stageLabel, type Fulfilment, type OrderActionResult, type OrderStage } from "@/lib/checkout/order";
import {
  acceptPayfastRecordAction,
  checkCardPaymentAction,
  recordRefundAction,
  resendOrderEmailAction,
  resolveOrderIssuesAction,
  setOrderStageAction,
} from "@/app/admin/actions";

/**
 * Runs an order action, then redraws the page from the server; holds its
 * error (or, for a courier action, its notice) until the next try. The page
 * is redrawn after an error too, since a courier action can fail after
 * changing the order.
 */
export function useOrderAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const run = (call: () => Promise<OrderActionResult>, then?: () => void) =>
    start(async () => {
      setError(null);
      setNotice(null);
      const done = await call().catch(() => ({ error: "That didn’t reach the server. Check the connection and try again." }));
      if ("error" in done) setError(done.error);
      else {
        if (done.notice) setNotice(done.notice);
        then?.();
      }
      router.refresh();
    });
  return { pending, error, notice, run };
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

/** The next step's button: moves the order to the stage it names. */
export function AdvanceStage({ ref_, stage, label }: { ref_: string; stage: OrderStage; label: string }) {
  const { pending, error, run } = useOrderAction();
  return (
    <>
      <Button size="md" loading={pending} onClick={() => run(() => setOrderStageAction(ref_, stage))}>
        {label}
      </Button>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
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
        Record a refund made outside PayFast
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
      <p className="hint">For money given back another way, such as cash at the counter. Refunds made in PayFast’s dashboard show on this order by themselves. Up to {rands(left)} is left to refund.</p>
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
export function ResendEmail({ ref_, who }: { ref_: string; who: OrderEmail }) {
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

/**
 * Marks the order paid from PayFast's own record, when its notice never
 * arrived. Asks once more first: it is the one control here that makes an
 * order paid, so it says what will happen before it does it.
 */
export function AcceptPayfastRecord({ ref_ }: { ref_: string }) {
  const { pending, error, run } = useOrderAction();
  const [sure, setSure] = useState(false);
  return (
    <div className="row">
      {sure ? (
        <>
          <Button color="blue" loading={pending} onClick={() => run(() => acceptPayfastRecordAction(ref_))}>
            Yes, mark it paid
          </Button>
          <Button variant="subtle" onClick={() => setSure(false)} disabled={pending}>
            Not yet
          </Button>
        </>
      ) : (
        <Button variant="light" onClick={() => setSure(true)}>
          Accept PayFast’s record
        </Button>
      )}
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Asks PayFast about the order's card payment; its answer is kept on the order. */
export function CheckWithPayfast({ ref_ }: { ref_: string }) {
  const { pending, error, run } = useOrderAction();
  return (
    <span className="oresend opay__ask">
      <button type="button" className="admin-link" disabled={pending} onClick={() => run(() => checkCardPaymentAction(ref_))}>
        {pending ? "Asking PayFast…" : "Check with PayFast"}
      </button>
      {error ? (
        <span className="admin-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
