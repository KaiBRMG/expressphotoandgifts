"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { SegmentedControl, Tabs } from "@mantine/core";
import {
  blockingIssues,
  changedSections,
  OLD_TABS,
  priceChanges,
  readinessIssues,
  STATUS_LABELS,
  STATUSES,
  TABS,
  toDraft,
  type Issue,
  type ProductDraft,
  type TabId,
} from "@/lib/catalog/edit";
import { productHref } from "@/lib/catalog/listing";
import { withTerm, type AddedTerm, type Vocabulary } from "@/lib/catalog/tags";
import type { Category, Product, ProductStatus } from "@/lib/catalog/types";
import { Alert, External } from "@/app/site/icons";
import { BackToProducts } from "@/app/admin/(console)/products/BackToProducts";
import { saveProductAction } from "../actions";
import { CustomerPhotoTab } from "./CustomerPhotoTab";
import type { Boxes } from "@/lib/checkout/boxes";
import { Duplicate } from "./Duplicate";
import { PageTab } from "./PageTab";
import { PhotosTab } from "./PhotosTab";
import { Preview } from "./Preview";
import { PricesTab } from "./PricesTab";
import { Records } from "./Records";
import { ShelfTab } from "./ShelfTab";
import { SaveBar, type NextInQueue, type Reach, type SaveState } from "./SaveBar";
import { useLeaveGuard } from "./useLeaveGuard";

/** A change to the draft, or a function of the latest draft for work that finishes later (an upload). */
export type Update = (patch: Partial<ProductDraft> | ((d: ProductDraft) => Partial<ProductDraft>)) => void;

export type Suggestions = { pairings: string[]; processes: string[] };

/** Another product, as "Goes with this" picks and matches it. */
export type CatalogueItem = Pick<Product, "slug" | "name" | "code" | "status" | "priceRange" | "tags"> & {
  formerSlugs?: string[];
  category: string;
  photo: string | null;
};

/** The save's own message for a field, if it has one: what the save bar lists and the server enforces, said where it is fixed. */
export type ErrorOn = (field: string) => string | undefined;

/**
 * One product, every part of it, saved together. The header carries its
 * status, the tabs carry the rest in the order a shopper meets them, and the
 * preview beside them shows that part of the shop as it is typed. Nothing
 * reaches the shop until Save, except a new type or occasion, which is
 * stored the moment it is added so every product can use it.
 */
export function ProductEditor({
  product,
  categories,
  suggestions,
  vocabulary,
  catalogue,
  next,
  boxes,
}: {
  product: Product;
  categories: Category[];
  suggestions: Suggestions;
  vocabulary: Vocabulary;
  catalogue: CatalogueItem[];
  next: NextInQueue;
  boxes: Boxes;
}) {
  // Grows when staff add a type or occasion here; the server has it already.
  const [vocab, setVocab] = useState(vocabulary);
  const addedTerm = useCallback((term: AddedTerm) => setVocab((v) => withTerm(v, term)), []);
  const router = useRouter();
  const params = useSearchParams();
  const [saved, setSaved] = useState({ slug: product.slug, updatedAt: product.updatedAt, draft: toDraft(product) });
  const [draft, setDraft] = useState(saved.draft);
  const [tab, setTab] = useState<TabId>(() => {
    const asked = params.get("tab") ?? "";
    return TABS.find((t) => t.id === asked)?.id ?? OLD_TABS[asked] ?? "shelf";
  });
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [uploading, setUploading] = useState(0);
  const [saving, startSaving] = useTransition();
  // The version before the last save, while that save can still be taken back.
  const [undoTo, setUndoTo] = useState<ProductDraft | null>(null);

  const update: Update = useCallback((patch) => {
    setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
    setState((s) => (s.kind === "saved" || s.kind === "invalid" ? { kind: "idle" } : s));
    setUndoTo(null);
  }, []);

  const changed = useMemo(() => changedSections(saved.draft, draft), [saved.draft, draft]);
  const dirty = changed.length > 0;
  const blocking = useMemo(() => blockingIssues(draft), [draft]);
  const errorOn: ErrorOn = useMemo(() => {
    const byField = new Map<string, string>();
    for (const i of blocking) if (!byField.has(i.field)) byField.set(i.field, i.message);
    return (field) => byField.get(field);
  }, [blocking]);
  const readiness = useMemo(() => readinessIssues(draft, vocab), [draft, vocab]);
  const issues = useMemo(() => (draft.status === "active" ? [...blocking, ...readiness] : blocking), [draft.status, blocking, readiness]);

  useLeaveGuard(dirty);

  // What saving would change in the shop itself, said before Save is pressed.
  const reach: Reach = useMemo(() => {
    const was = saved.draft.status === "active";
    const will = draft.status === "active";
    if (!was && will) return { kind: "publish" };
    if (was && !will) return { kind: "unpublish", retire: draft.status === "archived" };
    return was ? { kind: "live", prices: priceChanges(saved.draft, draft) } : { kind: "none" };
  }, [saved.draft, draft]);

  const chooseTab = (id: TabId) => {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  };

  /** Opens the tab an issue lives on (Shop records sit under every tab) and puts the cursor on the control that fixes it. */
  const follow = (issue: Pick<Issue, "tab" | "field">) => {
    if (issue.tab !== "records") chooseTab(issue.tab);
    focusField(issue.field);
  };

  /**
   * Writes a version and, once stored, makes it the saved one. A save can then
   * be undone back to what was saved before it, unless it dropped photos: those
   * are destroyed with it. An undo itself isn't offered back.
   */
  const commit = useCallback(
    (version: ProductDraft, undone: boolean, failed: (message: string | null) => SaveState) =>
      startSaving(async () => {
        const result = await saveProductAction(saved.slug, saved.updatedAt, version).catch(() => null);
        if (result?.ok) {
          setSaved({ slug: saved.slug, updatedAt: result.updatedAt, draft: version });
          if (undone) setDraft(version);
          setUndoTo(undone || result.removedImages ? null : saved.draft);
          return setState({ kind: "saved", live: version.status === "active", undone });
        }
        if (result && (result.reason === "conflict" || result.reason === "gone")) return setState({ kind: "conflict", message: result.message });
        setState(failed(result?.message ?? null));
      }),
    [saved],
  );

  const save = useCallback(() => {
    if (!dirty || saving) return;
    if (uploading) return setState({ kind: "invalid", issues: [], message: "Wait for the photos to finish uploading." });
    if (blocking.length) return setState({ kind: "invalid", issues: blocking, message: null });
    if (issues.length)
      return setState({
        kind: "invalid",
        issues,
        message: `It can’t show in the shop yet. Fix ${issues.length === 1 ? "this" : "these"}, or set it to Hidden to save it as it is:`,
      });
    commit(draft, false, (message) => ({ kind: "error", message: message ?? "The save didn’t reach the server. Check the connection and try again." }));
  }, [dirty, saving, uploading, blocking, issues, draft, commit]);

  /** Saves the version before the last save again. If that fails, it stays here as unsaved changes. */
  const undo = () => {
    if (!undoTo || saving) return;
    const previous = undoTo;
    setUndoTo(null);
    commit(previous, true, (message) => {
      setDraft(previous);
      return {
        kind: "error",
        message: `${message ?? "The undo didn’t reach the server."} The earlier version is here unsaved: Save to try again, or Discard to keep the last save.`,
      };
    });
  };

  // Arriving from a need on the list ("No type"), go straight to the control that fixes it.
  // Once, on arrival; the parameter is then taken out of the address, so a second run finds nothing.
  useEffect(() => {
    const field = new URL(window.location.href).searchParams.get("fix");
    if (!field) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("fix");
    window.history.replaceState(null, "", url);
    // The link names the tab too, so it is open already.
    if (readinessIssues(saved.draft, vocab).some((i) => i.field === field)) focusField(field);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the product as it opened, once
  }, []);

  const discard = () => {
    setDraft(saved.draft);
    setState({ kind: "idle" });
  };

  // ⌘S / Ctrl+S saves, as it does everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const category = categories.find((c) => c.id === draft.categoryId);
  const live = saved.draft.status === "active";
  const tabIssues = (id: TabId) => issues.filter((i) => i.tab === id).length;

  return (
    <div className="editor">
      <div className="editor__top">
        <BackToProducts />
        <div className="editor__links">
          {live ? (
            <a href={productHref(saved.slug)} target="_blank" rel="noopener" className="admin-link editor__view">
              View in the shop
              <External size={18} />
            </a>
          ) : null}
          <Duplicate slug={saved.slug} dirty={dirty} />
        </div>
      </div>

      <header className="editor__head">
        <div className="editor__titles">
          <h1 className="page__title">{draft.name.trim() || "Untitled product"}</h1>
          <p className="editor__meta">
            <span className="mono">{draft.code || "No code"}</span>
            {category ? <span>{category.name}</span> : null}
          </p>
        </div>

        <div className="editor__visibility">
          <SegmentedControl
            aria-label="Status"
            value={draft.status}
            onChange={(v) => update({ status: v as ProductStatus })}
            data={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
          />
        </div>
      </header>

      <StatusNote status={draft.status} readiness={readiness} onFollow={follow} />

      <div className="editor__body">
        <div className="editor__main">
        <Tabs value={tab} onChange={(v) => v && chooseTab(v as TabId)} className="editor__tabs" keepMounted={false}>
          <Tabs.List aria-label="Parts of the product">
            {TABS.map((t) => {
              const n = tabIssues(t.id);
              return (
                <Tabs.Tab key={t.id} value={t.id}>
                  <span className="tab__label">
                    {t.label}
                    {changed.includes(t.id) ? (
                      <>
                        <span className="tab__dot" aria-hidden="true" />
                        <span className="visually-hidden">, changed</span>
                      </>
                    ) : null}
                    {n ? (
                      <span className="tab__issue">
                        <Alert size={16} />
                        <span className="visually-hidden">, {n} to fix</span>
                      </span>
                    ) : null}
                  </span>
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          <Tabs.Panel value="shelf">
            <ShelfTab draft={draft} update={update} categories={categories} vocabulary={vocab} onAdded={addedTerm} slug={saved.slug} />
          </Tabs.Panel>
          <Tabs.Panel value="photos">
            <PhotosTab draft={draft} update={update} onUploading={(n) => setUploading((u) => u + n)} />
          </Tabs.Panel>
          <Tabs.Panel value="page">
            <PageTab draft={draft} update={update} suggestions={suggestions} catalogue={catalogue} errorOn={errorOn} />
          </Tabs.Panel>
          <Tabs.Panel value="prices">
            <PricesTab draft={draft} update={update} errorOn={errorOn} />
          </Tabs.Panel>
          <Tabs.Panel value="checkout">
            <CustomerPhotoTab draft={draft} update={update} errorOn={errorOn} boxes={boxes} />
          </Tabs.Panel>
        </Tabs>

        <Records
          draft={draft}
          errorOn={errorOn}
          update={update}
          suggestions={suggestions}
          slug={saved.slug}
          updatedAt={saved.updatedAt}
          dirty={dirty}
          onMoved={(slug) => router.replace(`/admin/products/${slug}`)}
        />
        </div>

        <Preview
          draft={draft}
          slug={saved.slug}
          category={category?.name ?? ""}
          tab={tab}
          vocabulary={vocab}
          catalogue={catalogue}
          onGo={(t, field) => follow({ tab: t, field })}
        />
      </div>

      <SaveBar
        state={state}
        dirty={dirty}
        saving={saving}
        uploading={uploading > 0}
        changed={changed}
        reach={reach}
        next={next}
        onUndo={undoTo ? undo : null}
        onSave={save}
        onDiscard={discard}
        onFollow={follow}
        onReload={() => router.refresh()}
      />
    </div>
  );
}

/** Brings the control that fixes an issue into view and puts the cursor on it, once its tab has drawn. */
function focusField(id: string) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    (el?.matches("input, textarea, button, select") ? el : el?.querySelector<HTMLElement>("input, textarea, button"))?.focus({ preventScroll: true });
  });
}

/** What the chosen status means, and for In the shop, what it still needs. */
function StatusNote({
  status,
  readiness,
  onFollow,
}: {
  status: ProductStatus;
  readiness: Issue[];
  onFollow: (i: Issue) => void;
}) {
  if (status === "active" && readiness.length) {
    return (
      <div className="checklist" role="region" aria-label="Before it can show in the shop">
        <p className="checklist__title">Before shoppers can see it:</p>
        <ul>
          {readiness.map((i) => (
            <li key={i.message}>
              <button type="button" className="admin-link" onClick={() => onFollow(i)}>
                {i.message}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (status === "draft") return <p className="editor__note">Hidden: shoppers can’t find, see or buy it. Kept here to finish or bring back.</p>;
  if (status === "archived") return <p className="editor__note">Retired: no longer sold, and off the list of products to finish. Past orders still show it.</p>;
  return null;
}
