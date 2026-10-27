"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Checkbox, NumberInput, Select, Textarea, TextInput, type ComboboxItem } from "@mantine/core";
import type { OrderEmail } from "@/lib/checkout/emails";
import { itemCount, rands } from "@/lib/catalog/listing";
import { lineWhat, NOTE_MAX, type OrderActionResult, type OrderStage } from "@/lib/checkout/order";
import {
  CANCEL_REASONS,
  cancelInput,
  deliveryRefunded,
  deliveryRule,
  isCancelReason,
  isPersonalised,
  isRefundReason,
  leavesNoGoods,
  linePaid,
  planRefund,
  refundedUnits,
  REFUND_REASONS,
  type CancelReason,
  type Refundable,
  type RefundInput,
  type RefundReason,
} from "@/lib/checkout/refunds";
import {
  acceptPayfastRecordAction,
  checkCardPaymentAction,
  cancelOrderAction,
  checkRefundAction,
  recordDashboardRefundAction,
  refundOrderAction,
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

/** A reason in the list: the words first, the clause of the terms it rests on as a small mark beneath. */
const reasonOption = ({ option }: { option: ComboboxItem }) => {
  const terms = REFUND_REASONS[option.value as RefundReason].terms;
  return (
    <span className="reasonopt">
      {option.label}
      {terms ? <span className="reasonopt__terms">{/^\d/.test(terms) ? `Terms ${terms}` : terms}</span> : null}
    </span>
  );
};

/**
 * The refund, as the terms work it out (`lib/checkout/refunds.ts`): why,
 * which units, and whether delivery goes back, with anything the terms let
 * the shop keep. The amount is worked out here as staff choose and again on
 * the server. It goes through PayFast to the customer's card; a payment
 * PayFast refunds only to a bank account is refunded in its dashboard, then
 * recorded here.
 */
export function RefundForm({ order }: { order: Refundable }) {
  const { pending, error, notice, run } = useOrderAction();
  const [open, setOpen] = useState(false);
  // The choices staff confirmed, so any change after asks again.
  const [sure, setSure] = useState<string | null>(null);
  const [reason, setReason] = useState<RefundReason | null>(null);
  const [units, setUnits] = useState<Record<number, number>>({});
  const [delivery, setDelivery] = useState(false);
  const [keep, setKeep] = useState<string | number>("");
  const [keepNote, setKeepNote] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const done = refundedUnits(order);
  const deliveryLeft = order.delivery - deliveryRefunded(order);
  const input: RefundInput | null = reason
    ? {
        reason,
        lines: Object.entries(units).map(([line, quantity]) => ({ line: Number(line), quantity })),
        delivery,
        keep: keep === "" ? 0 : Math.round(Number(keep) * 100),
        keepNote,
        note,
        message,
      }
    : null;
  const planned = input ? planRefund(order, input) : null;
  const rule = input ? deliveryRule(input.reason, leavesNoGoods(order, input.lines, done)) : "no";
  const confirmed = sure !== null && sure === JSON.stringify(input);
  const reset = () => {
    setOpen(false);
    setSure(null);
    setReason(null);
    setUnits({});
    setDelivery(false);
    setKeep("");
    setKeepNote("");
    setNote("");
    setMessage("");
  };

  if (!open) {
    return (
      <>
        {notice ? <p className="hint" role="status">{notice}</p> : null}
        <Button variant="default" size="sm" className="osec__more" onClick={() => setOpen(true)}>
          Refund part or all…
        </Button>
      </>
    );
  }

  const amount = planned?.ok ? planned.plan.amount : 0;
  const send = (call: typeof refundOrderAction) => run(() => call(order.ref, input), reset);
  return (
    <form className="oform" onSubmit={(e) => e.preventDefault()}>
      <p className="hint">Refunds go back through PayFast to the card or account the customer paid with (terms 11.1), and the customer is emailed.</p>
      <Select
        label="Why"
        placeholder="Choose the reason"
        data={Object.entries(REFUND_REASONS).map(([value, r]) => ({ value, label: r.label }))}
        renderOption={reasonOption}
        value={reason}
        onChange={(v) => {
          setReason(isRefundReason(v) ? v : null);
        }}
        allowDeselect={false}
      />
      {order.lines.map((l, i) =>
        l.quantity - done[i] > 0 ? (
          <NumberInput
            key={i}
            label={`${lineWhat(l)}${isPersonalised(l) ? " · personalised" : ""}`}
            description={`${rands(linePaid(l))} paid for the line${done[i] ? `, ${done[i]} already refunded` : ""}`}
            min={0}
            max={l.quantity - done[i]}
            allowDecimal={false}
            value={units[i] ?? 0}
            onChange={(v) => setUnits((u) => ({ ...u, [i]: Number(v) || 0 }))}
          />
        ) : null,
      )}
      {deliveryLeft > 0 && rule !== "no" ? (
        <Checkbox
          label={`Delivery, ${rands(deliveryLeft)}${rule === "must" ? ": the terms give it back with this refund" : ""}`}
          checked={rule === "must" || delivery}
          disabled={rule === "must"}
          onChange={(e) => setDelivery(e.currentTarget.checked)}
        />
      ) : null}
      {reason && REFUND_REASONS[reason].keep ? (
        <>
          <NumberInput label={`Kept back: ${REFUND_REASONS[reason].keep.toLowerCase()}`} leftSection="R" decimalScale={2} min={0} value={keep} onChange={setKeep} />
          {keep !== "" && Number(keep) > 0 ? <TextInput label="What’s kept, for the customer’s email" maxLength={200} value={keepNote} onChange={(e) => setKeepNote(e.currentTarget.value)} /> : null}
        </>
      ) : null}
      <CustomerMessage value={message} onChange={setMessage} required={reason === "unsupplied"} />
      <Textarea label="Note for the record (optional)" autosize minRows={2} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
      {planned && !planned.ok && (Object.keys(units).length || delivery) ? <p className="admin-error">{planned.error}</p> : null}
      {planned?.ok ? <p className="hint">The customer gets <strong>{rands(amount)}</strong>{planned.plan.whole && planned.plan.beforeSent ? ", and the order is cancelled." : "."}</p> : null}
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="row">
        {confirmed ? (
          <>
            <Button color="red" loading={pending} onClick={() => send(refundOrderAction)}>
              Yes, refund {rands(amount)}
            </Button>
            <Button variant="subtle" onClick={() => setSure(null)} disabled={pending}>
              Not yet
            </Button>
          </>
        ) : (
          <>
            <Button disabled={!planned?.ok} onClick={() => setSure(JSON.stringify(input))}>
              Refund {amount ? rands(amount) : ""} through PayFast
            </Button>
            <Button variant="default" disabled={!planned?.ok} loading={pending} onClick={() => send(recordDashboardRefundAction)}>
              It was refunded in PayFast’s dashboard
            </Button>
            <Button variant="subtle" onClick={reset} disabled={pending}>
              Close
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

/** The shop's words to the customer, which their email carries. Required when the shop can't supply it: 10.4 says the customer is told why. */
function CustomerMessage({ value, onChange, required }: { value: string; onChange: (v: string) => void; required: boolean }) {
  return (
    <Textarea
      label={required ? "Tell the customer why" : "Message to the customer (optional)"}
      description="In their email, as written"
      autosize
      minRows={2}
      maxLength={500}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      required={required}
    />
  );
}

/**
 * Cancels the order from the shop's side, when the customer has asked (by
 * email, phone or at the counter, 10.1) or the shop can't go on with it:
 * everything still due goes back through PayFast, less only what 10.2 lets
 * the shop keep for personalised work already started; a waybill the courier
 * hasn't collected is cancelled; and its stock is put back when staff say it
 * wasn't used. The customer is emailed what was refunded, and why.
 */
export function CancelOrder({ order, units, waybill }: { order: Refundable; units: number; waybill: string | null }) {
  const { pending, error, notice, run } = useOrderAction();
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState<string | null>(null);
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [keep, setKeep] = useState<string | number>("");
  const [keepNote, setKeepNote] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  // Nothing was made yet at New, so its stock goes back by default; after that, staff say.
  const [restock, setRestock] = useState(order.stage === "new");

  const fields = reason ? { reason, keep: keep === "" ? 0 : Math.round(Number(keep) * 100), keepNote, note, message } : null;
  const planned = fields ? planRefund(order, cancelInput(order, fields)) : null;
  const amount = planned?.ok ? planned.plan.amount : 0;
  const started = order.stage !== "new" && order.lines.some(isPersonalised);
  const asked = fields ? JSON.stringify({ ...fields, restock }) : null;
  const confirmed = sure !== null && sure === asked;
  const reset = () => {
    setOpen(false);
    setSure(null);
    setReason(null);
    setKeep("");
    setKeepNote("");
    setMessage("");
    setNote("");
  };

  if (!open) {
    return (
      <>
        {notice ? <p className="hint" role="status">{notice}</p> : null}
        <Button variant="default" size="sm" className="osec__more" onClick={() => setOpen(true)}>
          Cancel the order…
        </Button>
      </>
    );
  }

  const send = (via: "payfast" | "dashboard") => run(() => cancelOrderAction(order.ref, { ...fields, restock }, via), reset);
  return (
    <form className="oform" onSubmit={(e) => e.preventDefault()}>
      <p className="hint">
        Everything still due goes back through PayFast to what the customer paid with, delivery too, and they’re emailed.
        {waybill ? ` Waybill ${waybill} is cancelled with The Courier Guy.` : ""}
      </p>
      <Select
        label="Why"
        placeholder="Choose the reason"
        data={CANCEL_REASONS.map((value) => ({ value, label: REFUND_REASONS[value].label }))}
        renderOption={reasonOption}
        value={reason}
        onChange={(v) => setReason(isCancelReason(v) ? v : null)}
        allowDeselect={false}
      />
      {reason === "cancelled" && started ? (
        <>
          <NumberInput
            label="Kept back: work already done on personalised items"
            description="Up to their price, only if making has started (10.2). Leave empty to refund in full."
            leftSection="R"
            decimalScale={2}
            min={0}
            value={keep}
            onChange={setKeep}
          />
          {keep !== "" && Number(keep) > 0 ? <TextInput label="What’s kept, for the customer’s email" maxLength={200} value={keepNote} onChange={(e) => setKeepNote(e.currentTarget.value)} /> : null}
        </>
      ) : null}
      <CustomerMessage value={message} onChange={setMessage} required={reason === "unsupplied"} />
      <Textarea label="Note for the record (optional)" placeholder="Asked by phone, 14:10" autosize minRows={2} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
      {units > 0 ? <Checkbox label={`Put its ${itemCount(units)} back in stock: they weren’t made or used`} checked={restock} onChange={(e) => setRestock(e.currentTarget.checked)} /> : null}
      {planned && !planned.ok ? <p className="admin-error">{planned.error}</p> : null}
      {planned?.ok ? <p className="hint">The customer gets <strong>{rands(amount)}</strong>, and the order is cancelled.</p> : null}
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="row">
        {confirmed ? (
          <>
            <Button color="red" loading={pending} onClick={() => send("payfast")}>
              Yes, cancel and refund {rands(amount)}
            </Button>
            <Button variant="subtle" onClick={() => setSure(null)} disabled={pending}>
              Not yet
            </Button>
          </>
        ) : (
          <>
            <Button color="red" variant="light" disabled={!planned?.ok} onClick={() => setSure(asked)}>
              Cancel and refund {amount ? rands(amount) : ""} through PayFast
            </Button>
            <Button variant="default" disabled={!planned?.ok} loading={pending} onClick={() => send("dashboard")}>
              Refunded in PayFast’s dashboard: cancel it
            </Button>
            <Button variant="subtle" onClick={reset} disabled={pending}>
              Close
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

/** A refund asked of PayFast whose outcome is still to be settled: checked against PayFast's record before anything else is refunded. */
export function CheckRefund({ ref_, amount, unclear }: { ref_: string; amount: number; unclear: boolean }) {
  const { pending, error, notice, run } = useOrderAction();
  return (
    <div className="oform">
      <p className="hint">
        {unclear ? `PayFast’s answer to a refund of ${rands(amount)} couldn’t be read, so it may or may not have been made.` : `A refund of ${rands(amount)} is with PayFast.`} Check PayFast’s record
        before refunding again.
      </p>
      {notice ? <p className="hint" role="status">{notice}</p> : null}
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="row">
        <Button variant="default" size="sm" loading={pending} onClick={() => run(() => checkRefundAction(ref_))}>
          Check the refund
        </Button>
      </div>
    </div>
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
