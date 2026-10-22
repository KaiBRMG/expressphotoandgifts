"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, CloseButton, Menu } from "@mantine/core";
import type { VisibilityChange, VisibilityResult } from "@/lib/admin/products";
import { productCount } from "@/lib/catalog/listing";
import { Alert, ArrowDown, Check } from "@/app/site/icons";
import { setVisibilityAction } from "../../actions";

type ActionId = "show" | "hide" | "retire";

/**
 * What each bulk action does. A change of status reaches the shop, so it asks
 * once in the bar. Everything can be undone from the bar afterwards. Specials
 * come from campaigns, which the menu starts with the chosen products in.
 */
const ACTIONS: Record<
  ActionId,
  {
    label: string;
    change: Omit<VisibilityChange, "slug">;
    /** The question asked first, its consequence, and the button that answers yes. */
    confirm?: { ask: (n: number) => string; note: string; yes: (n: number) => string };
    done: (n: number) => string;
  }
> = {
  show: {
    label: "Show in shop",
    change: { status: "active" },
    confirm: {
      ask: (n) => `Put ${productCount(n)} in the shop?`,
      note: "Any still missing a price, a main photo or a type stay hidden, and are listed after.",
      yes: () => "Show in shop",
    },
    done: (n) => `${productCount(n)} now showing in the shop.`,
  },
  hide: {
    label: "Hide from shop",
    change: { status: "draft" },
    confirm: {
      ask: (n) => `Hide ${productCount(n)} from the shop?`,
      note: "Shoppers can’t see or buy them until they’re shown again.",
      yes: (n) => `Hide ${n}`,
    },
    done: (n) => `${productCount(n)} hidden from the shop.`,
  },
  retire: {
    label: "Retire",
    change: { status: "archived" },
    confirm: {
      ask: (n) => `Retire ${productCount(n)}?`,
      note: "They’re no longer sold and move to Retired. Past orders still show them.",
      yes: (n) => `Retire ${n}`,
    },
    done: (n) => `${productCount(n)} retired.`,
  },
};

type State =
  | { kind: "idle" }
  | { kind: "asking"; action: ActionId }
  | { kind: "done"; message: string; skipped: string[]; before: VisibilityChange[] }
  | { kind: "error"; message: string };

/**
 * The bar that appears once rows are chosen: a count, the actions, and after
 * one runs, what changed, what was skipped and why, and Undo.
 */
export function BulkBar({ slugs, onClear, onDone }: { slugs: string[]; onClear: () => void; onDone: () => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [working, startWorking] = useTransition();

  const run = (changes: VisibilityChange[], describe: (result: VisibilityResult) => string, clearAfter: boolean) =>
    startWorking(async () => {
      const result = await setVisibilityAction(changes).catch(() => null);
      if (!result) return setState({ kind: "error", message: "The change didn’t reach the server. Check the connection and try again." });
      if ("error" in result) return setState({ kind: "error", message: result.error });
      setState({ kind: "done", message: describe(result), skipped: result.skipped, before: result.before });
      if (clearAfter) onClear();
      onDone();
    });

  const start = (id: ActionId) => (ACTIONS[id].confirm ? setState({ kind: "asking", action: id }) : apply(id));

  const apply = (id: ActionId) => {
    const a = ACTIONS[id];
    run(
      slugs.map((slug) => ({ slug, ...a.change })),
      (r) => (r.before.length ? a.done(r.before.length) : "Nothing changed: they were already set that way."),
      true,
    );
  };

  const undo = (before: VisibilityChange[]) => run(before, () => "Undone. They’re back as they were.", false);

  if (state.kind === "done" || state.kind === "error") {
    const done = state.kind === "done";
    return (
      <div className={`bulkbar ${done ? "" : "bulkbar--alert"}`} role={done ? "status" : "alert"}>
        <div className="bulkbar__text">
          <p className="bulkbar__line">
            {done ? <Check size={20} /> : <Alert size={20} />}
            <span>{state.message}</span>
          </p>
          {done && state.skipped.length ? (
            <ul className="bulkbar__skipped">
              {state.skipped.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="bulkbar__actions">
          {done && state.before.length ? (
            <Button variant="light" loading={working} onClick={() => undo(state.before)}>
              Undo
            </Button>
          ) : null}
          <CloseButton aria-label="Dismiss" size="lg" onClick={() => setState({ kind: "idle" })} />
        </div>
      </div>
    );
  }

  if (slugs.length === 0) return null;

  const confirm = state.kind === "asking" && ACTIONS[state.action].confirm;
  if (confirm) {
    const action = state.action;
    return (
      <div className="bulkbar bulkbar--asking" role="alertdialog" aria-labelledby="bulk-ask" aria-describedby="bulk-note">
        <div className="bulkbar__text">
          <p id="bulk-ask" className="bulkbar__line bulkbar__ask">
            {confirm.ask(slugs.length)}
          </p>
          <p id="bulk-note" className="hint">
            {confirm.note}
          </p>
        </div>
        <div className="bulkbar__actions">
          <Button variant="subtle" onClick={() => setState({ kind: "idle" })} disabled={working}>
            Cancel
          </Button>
          <Button loading={working} onClick={() => apply(action)} autoFocus>
            {confirm.yes(slugs.length)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bulkbar" role="region" aria-label="Selected products">
      <p className="bulkbar__line bulkbar__count">
        <span>{productCount(slugs.length)} selected</span>
        <button type="button" className="admin-link" onClick={onClear}>
          Clear
        </button>
      </p>
      <div className="bulkbar__actions">
        <Button variant="light" onClick={() => start("show")} disabled={working}>
          {ACTIONS.show.label}
        </Button>
        <Button variant="light" onClick={() => start("hide")} disabled={working}>
          {ACTIONS.hide.label}
        </Button>
        <Menu position="top-end" withArrow shadow="md">
          <Menu.Target>
            <Button variant="light" rightSection={<ArrowDown size={16} />} disabled={working} loading={working}>
              More
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item component={Link} href={`/admin/campaigns/new?product=${slugs.slice(0, 50).map(encodeURIComponent).join(",")}`}>
              Put in a campaign
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item onClick={() => start("retire")}>{ACTIONS.retire.label}</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div>
  );
}
