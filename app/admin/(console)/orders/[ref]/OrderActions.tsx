"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, NumberInput, Textarea } from "@mantine/core";
import type { OrderEmail } from "@/lib/checkout/emails";
import { itemCount, rands } from "@/lib/catalog/listing";
import { NOTE_MAX, type OrderActionResult, type OrderStage } from "@/lib/checkout/order";
import {
  acceptPayfastRecordAction,
  checkCardPaymentAction,
  recordRefundAction,
  resendOrderEmailAction,
  resolveOrderIssuesAction,
  returnStockAction,
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
      <Button variant="default" size="sm" className="osec__more" onClick={() => setOpen(true)}>
        Record a refund outside PayFast
      </Button>
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
      <p className="hint">Money given back outside PayFast. Up to {rands(left)} left.</p>
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

/**
 * Puts what the order took out of tracked stock back on the shelf, once: for
 * an order refunded or cancelled whose goods were never made or came back
 * unused. Its own step, since a refund may be made in PayFast's dashboard.
 */
export function ReturnToStock({ ref_, units }: { ref_: string; units: number }) {
  const { pending, error, run } = useOrderAction();
  return (
    <div className="oform">
      <p className="hint">
        Paying took {itemCount(units)} out of stock. If the order is refunded or cancelled and {units === 1 ? "it wasn’t" : "they weren’t"} made or used,
        put {units === 1 ? "it" : "them"} back so {units === 1 ? "it" : "they"} can be sold again.
      </p>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="row">
        <Button variant="default" size="sm" loading={pending} onClick={() => run(() => returnStockAction(ref_))}>
          Put back in stock
        </Button>
      </div>
    </div>
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
        placeholder="Checked PayFast: refunded the second payment"
        autosize
        minRows={2}
        maxLength={NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.currentTarget.value)}
        required
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="row">
        <Button type="submit" loading={pending}>
          Resolve
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
      <Button variant="default" size="xs" loading={pending} onClick={() => run(() => resendOrderEmailAction(ref_, who))}>
        Resend
      </Button>
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
        <Button onClick={() => setSure(true)}>
          Accept payment
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
      <Button variant="default" size="xs" loading={pending} onClick={() => run(() => checkCardPaymentAction(ref_))}>
        Check with PayFast
      </Button>
      {error ? (
        <span className="admin-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
