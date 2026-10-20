"use client";

import Link from "next/link";
import { Button, Popover } from "@mantine/core";
import { useState } from "react";
import { TABS, type Issue, type Place, type PriceChange, type TabId } from "@/lib/catalog/edit";
import { rands } from "@/lib/catalog/listing";
import { Alert, ArrowRight, Check } from "@/app/site/icons";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saved"; live: boolean; undone?: boolean }
  | { kind: "invalid"; issues: Issue[]; message: string | null }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

const SECTION_NAMES: Record<Place | "visibility", string> = {
  ...(Object.fromEntries(TABS.map((t) => [t.id, t.label])) as Record<TabId, string>),
  records: "Shop records",
  visibility: "Status",
};

/** What saving would change in the shop: putting it there, taking it out, or new prices on a product already showing. */
export type Reach =
  | { kind: "none" }
  | { kind: "publish" }
  | { kind: "unpublish"; retire: boolean }
  | { kind: "live"; prices: PriceChange[] };

/** The next product in the work queue, offered once this one is saved. */
export type NextInQueue = { slug: string; name: string; left: number } | null;

/** "Details", "Details and Photos", "Details, Photos and Status". */
const list = (names: string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/**
 * The one place a save happens. At rest it says nothing; with changes it
 * names where they are, in amber, beside Discard and Save; after a save it
 * says plainly whether the product is live.
 */
export function SaveBar({
  state,
  dirty,
  saving,
  uploading,
  changed,
  reach,
  next,
  onUndo,
  onSave,
  onDiscard,
  onFollow,
  onReload,
}: {
  state: SaveState;
  dirty: boolean;
  saving: boolean;
  uploading: boolean;
  changed: (Place | "visibility")[];
  reach: Reach;
  next: NextInQueue;
  /** Takes the last save back; null once it can't be. */
  onUndo: (() => void) | null;
  onSave: () => void;
  onDiscard: () => void;
  onFollow: (i: Issue) => void;
  onReload: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!dirty && state.kind === "idle") return null;

  if (state.kind === "conflict") {
    return (
      <div className="savebar savebar--alert" role="alert">
        <p className="savebar__text">
          <Alert size={20} />
          <span>
            {state.message} Loading the latest version drops your changes here, so note anything you need first.
          </span>
        </p>
        <div className="savebar__actions">
          <Button onClick={onReload}>Load the latest version</Button>
        </div>
      </div>
    );
  }

  if (!dirty && state.kind === "saved") {
    return (
      <div className="savebar savebar--done" role="status">
        <p className="savebar__text">
          <Check size={20} />
          <span>
            {state.undone
              ? `Undone. ${state.live ? "The shop shows it as it was before." : "It’s back as it was, hidden from the shop."}`
              : state.live
                ? "Saved. The shop shows it now."
                : "Saved. It stays hidden from the shop."}
            {next ? <span className="savebar__queue">{next.left === 1 ? "1 other product can’t show in the shop yet." : `${next.left} other products can’t show in the shop yet.`}</span> : null}
          </span>
        </p>
        {onUndo || next ? (
          <div className="savebar__actions">
            {onUndo ? (
              <Button variant="light" onClick={onUndo} loading={saving}>
                Undo
              </Button>
            ) : null}
            {next ? (
              <Button component={Link} href={`/admin/products/${next.slug}`} rightSection={<ArrowRight size={18} />} title={next.name} disabled={saving}>
                Next to finish
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  // Only drawn after an edit, never on the server, so the platform can be read.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <div className="savebar savebar--dirty" role="region" aria-label="Unsaved changes">
      <div className="savebar__text">
        {state.kind === "invalid" ? (
          <div role="alert" className="savebar__problems">
            <Alert size={20} />
            <div>
              <p>{state.message ?? `Can’t save yet. ${state.issues.length === 1 ? "One thing needs" : `${state.issues.length} things need`} fixing:`}</p>
              {state.issues.length ? (
                <ul>
                  {state.issues.map((i) => (
                    <li key={i.message}>
                      <button type="button" className="admin-link" onClick={() => onFollow(i)}>
                        {i.message}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : state.kind === "error" ? (
          <p role="alert" className="savebar__problems">
            <Alert size={20} />
            <span>Not saved. {state.message}</span>
          </p>
        ) : (
          <>
            <p>
              <span className="savebar__mark" aria-hidden="true" />
              Unsaved changes in {list(changed.map((c) => SECTION_NAMES[c]))}
            </p>
            <ReachNote reach={reach} />
          </>
        )}
      </div>

      <div className="savebar__actions">
        <Popover opened={confirming} onChange={setConfirming} position="top-end" withArrow shadow="md" trapFocus returnFocus>
          <Popover.Target>
            <Button variant="subtle" onClick={() => setConfirming((o) => !o)} disabled={saving}>
              Discard
            </Button>
          </Popover.Target>
          <Popover.Dropdown className="confirm">
            <p>Undo every change since the last save?</p>
            <div className="confirm__actions">
              <Button variant="subtle" onClick={() => setConfirming(false)}>
                Keep editing
              </Button>
              <Button
                color="red"
                onClick={() => {
                  setConfirming(false);
                  onDiscard();
                }}
              >
                Discard changes
              </Button>
            </div>
          </Popover.Dropdown>
        </Popover>
        <Button onClick={onSave} loading={saving} disabled={uploading} className="savebar__save">
          {uploading ? "Uploading photos…" : "Save changes"}
        </Button>
        <span className="savebar__kbd" aria-hidden="true">
          {mac ? "⌘S" : "Ctrl+S"}
        </span>
      </div>
    </div>
  );
}

const price = (cents: number | null) => (cents === null ? "no price" : rands(cents));

/** The stakes of this save, before it happens: the shop's own shelves, and what shoppers pay. */
function ReachNote({ reach }: { reach: Reach }) {
  if (reach.kind === "publish") return <p className="savebar__reach">Saving puts it in the shop for shoppers to buy.</p>;
  if (reach.kind === "unpublish")
    return <p className="savebar__reach">{reach.retire ? "Saving retires it and takes it out of the shop." : "Saving takes it out of the shop."}</p>;
  if (reach.kind !== "live" || reach.prices.length === 0) return null;

  const shown = reach.prices.slice(0, 4);
  return (
    <div className="savebar__reach">
      <p>It’s in the shop, so shoppers pay {reach.prices.length === 1 ? "this price" : "these prices"} as soon as you save:</p>
      <ul className="savebar__prices">
        {shown.map((p) => (
          <li key={p.title}>
            {p.title === "Default" ? "" : `${p.title}: `}
            <span className="mono">{price(p.from)}</span> → <span className="mono">{price(p.to)}</span>
            {p.jump ? (
              <strong className="savebar__jump">
                <Alert size={16} />
                {p.to! < p.from! ? "under half the old price" : "over double the old price"}
              </strong>
            ) : null}
          </li>
        ))}
        {reach.prices.length > shown.length ? <li>and {reach.prices.length - shown.length} more</li> : null}
      </ul>
    </div>
  );
}
