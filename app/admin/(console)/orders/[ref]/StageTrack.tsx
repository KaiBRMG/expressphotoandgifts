"use client";

import { useState } from "react";
import { Button, Menu } from "@mantine/core";
import { STAGES, stageLabel, type Fulfilment, type OrderStage } from "@/lib/checkout/order";
import { setOrderStageAction } from "@/app/admin/actions";
import { ArrowLeft, Check } from "@/app/site/icons";
import { useOrderAction } from "./OrderActions";

/** The track calls the first stage "Paid"; moving back to it, it's "not started". */
const backLabel = (s: OrderStage, method: Fulfilment["method"]) => (s === "new" ? "Paid, not started" : stageLabel(s, method));

export type TrackStep = { key: string; label: string; at: string | null; state: "done" | "now" | "todo" };

/**
 * Where the order is, as a line of steps; read-only, since the next step
 * moves it on. The one control here takes it back a stage, for a mistake,
 * after asking once.
 */
export function StageTrack({ ref_, steps, stage, method }: { ref_: string; steps: TrackStep[]; stage: OrderStage; method: Fulfilment["method"] }) {
  const { pending, error, run } = useOrderAction();
  const [to, setTo] = useState<OrderStage | null>(null);
  const earlier = STAGES.slice(0, STAGES.indexOf(stage));

  return (
    <div className="otrack">
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

      {earlier.length ? (
        <div className="otrack__back">
          {to ? (
            <>
              <span className="otrack__ask">Back to {backLabel(to, method)}?</span>
              <Button size="xs" color="red" variant="light" loading={pending} onClick={() => run(() => setOrderStageAction(ref_, to), () => setTo(null))}>
                Move back
              </Button>
              <Button size="xs" variant="subtle" disabled={pending} onClick={() => setTo(null)}>
                Keep
              </Button>
            </>
          ) : (
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button size="xs" variant="subtle" leftSection={<ArrowLeft size={16} />}>
                  Move back
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {[...earlier].reverse().map((s) => (
                  <Menu.Item key={s} onClick={() => setTo(s)}>
                    {backLabel(s, method)}
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
      ) : null}
    </div>
  );
}
