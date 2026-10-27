"use client";

import { useState } from "react";
import { Button, Menu } from "@mantine/core";
import { STAGES, stageLabel, type Fulfilment, type OrderStage } from "@/lib/checkout/order";
import { setOrderStageAction } from "@/app/admin/actions";
import { Check, Pencil } from "@/app/site/icons";
import { useOrderAction } from "./OrderActions";

/** The track calls the first stage "Paid"; as somewhere to put the order, it's "not started". */
const stageName = (s: OrderStage, method: Fulfilment["method"]) => (s === "new" ? "Paid, not started" : stageLabel(s, method));

/** What the change will do beyond moving the order, said before staff confirm it. */
function consequence(o: { to: OrderStage; method: Fulfilment["method"]; readyEmailed: boolean; waybill: boolean }) {
  if (o.to === "ready" && o.method === "collect" && !o.readyEmailed) return "Emails the customer that it’s ready.";
  if (o.to === "done" && o.method === "courier" && !o.waybill) return "No waybill is booked, so it’s marked sent without tracking.";
  return null;
}

export type TrackStep = { key: string; label: string; at: string | null; state: "done" | "now" | "todo" };

/**
 * Where the order is, as a line of steps. The next step moves it on; this
 * control is for when the shop's work and the record disagree (a collection
 * that wasn't logged, a mistake), setting it to any other stage after asking
 * once, with what that will do.
 */
export function StageTrack({ ref_, steps, stage, method, readyEmailed, waybill }: { ref_: string; steps: TrackStep[]; stage: OrderStage; method: Fulfilment["method"]; readyEmailed: boolean; waybill: boolean }) {
  const { pending, error, run } = useOrderAction();
  const [to, setTo] = useState<OrderStage | null>(null);
  const order: readonly OrderStage[] = STAGES;
  const back = to !== null && order.indexOf(to) < order.indexOf(stage);
  const extra = to ? consequence({ to, method, readyEmailed, waybill }) : null;
  // On a phone the steps don't fit in a line, and five stacked rows push the next step off the screen: one sentence says where it is.
  const at = steps.findIndex((s) => s.state === "now");
  const summary = at >= 0 ? `Step ${at + 1} of ${steps.length}: ${steps[at].label}` : `All ${steps.length} steps done`;

  return (
    <div className="otrack">
      <p className="otrack__summary">{summary}</p>
      <ol className="otrack__steps" aria-label="Stage">
        {steps.map((s) => (
          <li key={s.key} className={`otrack__step otrack__step--${s.state}`} aria-current={s.state === "now" ? "step" : undefined}>
            <span className="otrack__dot" aria-hidden="true">
              {s.state === "done" ? <Check size={14} /> : null}
            </span>
            <span className="otrack__label">{s.label}</span>
            {s.at ? <span className="otrack__at">{s.at}</span> : null}
          </li>
        ))}
      </ol>

      {/* A cancelled order is finished by its refund: no stage to move it to. */}
      {stage === "cancelled" ? null : (
        <div className="otrack__change">
          {to ? (
            <>
              <span className="otrack__ask">
                {back ? "Move back to" : "Move on to"} {stageName(to, method)}?
                {extra ? <span className="otrack__extra">{extra}</span> : null}
              </span>
              <div className="otrack__confirm">
                <Button size="xs" color={back ? "red" : undefined} variant={back ? "light" : "filled"} loading={pending} onClick={() => run(() => setOrderStageAction(ref_, to), () => setTo(null))}>
                  {back ? "Move back" : "Move on"}
                </Button>
                <Button size="xs" variant="subtle" disabled={pending} onClick={() => setTo(null)}>
                  Keep
                </Button>
              </div>
            </>
          ) : (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button size="xs" variant="default" leftSection={<Pencil size={16} />}>
                  Change stage
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Set the order to</Menu.Label>
                {STAGES.map((s) => (
                  <Menu.Item key={s} disabled={s === stage} rightSection={s === stage ? <Check size={16} /> : null} onClick={() => setTo(s)}>
                    {stageName(s, method)}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
