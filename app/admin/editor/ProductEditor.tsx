"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { SegmentedControl, Switch, Tabs } from "@mantine/core";
import {
  blockingIssues,
  changedSections,
  readinessIssues,
  STATUS_LABELS,
  TABS,
  toDraft,
  type Issue,
  type ProductDraft,
  type TabId,
} from "@/lib/catalog/edit";
import { productHref } from "@/lib/catalog/listing";
import type { Category, Product, ProductStatus } from "@/lib/catalog/types";
import { Alert, ArrowLeft, External } from "@/app/site/icons";
import { saveProductAction } from "../actions";
import { CustomerPhotoTab } from "./CustomerPhotoTab";
import { DetailsTab } from "./DetailsTab";
import { FiltersTab } from "./FiltersTab";
import { PhotosTab } from "./PhotosTab";
import { Preview } from "./Preview";
import { PricesTab } from "./PricesTab";
import { SaveBar, type SaveState } from "./SaveBar";
import { useLeaveGuard } from "./useLeaveGuard";

/** A change to the draft, or a function of the latest draft for work that finishes later (an upload). */
export type Update = (patch: Partial<ProductDraft> | ((d: ProductDraft) => Partial<ProductDraft>)) => void;

export type Suggestions = { pairings: string[]; processes: string[] };

const STATUSES: ProductStatus[] = ["active", "draft", "archived"];

/**
 * One product, every part of it, saved together. The header carries what is
 * always worth seeing (its status and whether it is a special), the tabs carry
 * the rest, and the preview beside them shows the card shoppers will see as
 * it is typed. Nothing reaches the shop until Save.
 */
export function ProductEditor({
  product,
  categories,
  suggestions,
}: {
  product: Product;
  categories: Category[];
  suggestions: Suggestions;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [saved, setSaved] = useState({ slug: product.slug, updatedAt: product.updatedAt, draft: toDraft(product) });
  const [draft, setDraft] = useState(saved.draft);
  const [tab, setTab] = useState<TabId>(() => TABS.find((t) => t.id === params.get("tab"))?.id ?? "details");
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [uploading, setUploading] = useState(0);
  const [saving, startSaving] = useTransition();

  const update: Update = useCallback((patch) => {
    setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
    setState((s) => (s.kind === "saved" || s.kind === "invalid" ? { kind: "idle" } : s));
  }, []);

  const changed = useMemo(() => changedSections(saved.draft, draft), [saved.draft, draft]);
  const dirty = changed.length > 0;
  const blocking = useMemo(() => blockingIssues(draft), [draft]);
  const readiness = useMemo(() => readinessIssues(draft), [draft]);
  const issues = useMemo(() => (draft.status === "active" ? [...blocking, ...readiness] : blocking), [draft.status, blocking, readiness]);

  useLeaveGuard(dirty);

  const chooseTab = (id: TabId) => {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  };

  /** Opens the tab an issue lives on and puts the cursor on the control that fixes it. */
  const follow = (issue: Issue) => {
    chooseTab(issue.tab);
    requestAnimationFrame(() => {
      const el = document.getElementById(issue.field);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      (el?.matches("input, textarea, button, select") ? el : el?.querySelector<HTMLElement>("input, textarea, button"))?.focus({ preventScroll: true });
    });
  };

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
    startSaving(async () => {
      const result = await saveProductAction(saved.slug, saved.updatedAt, draft).catch(() => null);
      if (!result) return setState({ kind: "error", message: "The save didn’t reach the server. Check the connection and try again." });
      if (!result.ok) return setState(result.reason === "conflict" || result.reason === "gone" ? { kind: "conflict", message: result.message } : { kind: "error", message: result.message });
      setSaved({ slug: saved.slug, updatedAt: result.updatedAt, draft });
      setState({ kind: "saved", live: draft.status === "active" });
    });
  }, [dirty, saving, uploading, blocking, issues, saved, draft]);

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
        <Link href="/admin/products" className="back">
          <ArrowLeft size={18} />
          Products
        </Link>
        {live ? (
          <a href={productHref(saved.slug)} target="_blank" rel="noopener" className="admin-link editor__view">
            View in the shop
            <External size={18} />
          </a>
        ) : null}
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
          <Switch
            label="Show as a special"
            description="Badged Special and listed under Specials."
            checked={draft.special}
            onChange={(e) => update({ special: e.currentTarget.checked })}
            size="md"
          />
        </div>
      </header>

      <StatusNote status={draft.status} readiness={readiness} onFollow={follow} />

      <div className="editor__body">
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

          <Tabs.Panel value="details">
            <DetailsTab draft={draft} update={update} categories={categories} slug={saved.slug} updatedAt={saved.updatedAt} dirty={dirty} onMoved={(slug) => router.replace(`/admin/products/${slug}`)} />
          </Tabs.Panel>
          <Tabs.Panel value="photos">
            <PhotosTab draft={draft} update={update} onUploading={(n) => setUploading((u) => u + n)} />
          </Tabs.Panel>
          <Tabs.Panel value="prices">
            <PricesTab draft={draft} update={update} />
          </Tabs.Panel>
          <Tabs.Panel value="customer">
            <CustomerPhotoTab draft={draft} update={update} />
          </Tabs.Panel>
          <Tabs.Panel value="filters">
            <FiltersTab draft={draft} update={update} categories={categories} suggestions={suggestions} />
          </Tabs.Panel>
        </Tabs>

        <Preview draft={draft} slug={saved.slug} category={category?.name ?? ""} />
      </div>

      <SaveBar
        state={state}
        dirty={dirty}
        saving={saving}
        uploading={uploading > 0}
        changed={changed}
        onSave={save}
        onDiscard={discard}
        onFollow={follow}
        onReload={() => router.refresh()}
      />
    </div>
  );
}

/** What the chosen status means, and for Showing in shop, what it still needs. */
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
        <p className="checklist__title">Before it can show in the shop:</p>
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
  if (status === "draft") return <p className="editor__note">Shoppers can’t see or buy it.</p>;
  if (status === "archived") return <p className="editor__note">Out of the shop, kept so past orders still make sense.</p>;
  return null;
}
