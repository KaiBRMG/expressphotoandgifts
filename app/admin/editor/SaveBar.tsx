"use client";

import { Button, Popover } from "@mantine/core";
import { useState } from "react";
import { TABS, type Issue, type TabId } from "@/lib/catalog/edit";
import { Alert, Check } from "@/app/site/icons";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saved"; live: boolean }
  | { kind: "invalid"; issues: Issue[]; message: string | null }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

const SECTION_NAMES: Record<TabId | "visibility", string> = {
  ...(Object.fromEntries(TABS.map((t) => [t.id, t.label])) as Record<TabId, string>),
  visibility: "Status",
};

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
  onSave,
  onDiscard,
  onFollow,
  onReload,
}: {
  state: SaveState;
  dirty: boolean;
  saving: boolean;
  uploading: boolean;
  changed: (TabId | "visibility")[];
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
          {state.live ? "Saved. The shop shows it now." : "Saved. It stays hidden from the shop."}
        </p>
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
          <p>
            <span className="savebar__mark" aria-hidden="true" />
            Unsaved changes in {list(changed.map((c) => SECTION_NAMES[c]))}
          </p>
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
