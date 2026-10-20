"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, CloseButton, SegmentedControl, Select, TextInput } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { NEED_LABELS, STATUS_LABELS, type Need as NeedKind, type Place } from "@/lib/catalog/edit";
import { priceLabel } from "@/lib/catalog/listing";
import { queryWords, startsWords } from "@/lib/catalog/search";
import type { ProductStatus } from "@/lib/catalog/types";
import { ProductImage } from "@/app/site/ProductImage";
import { Alert, ArrowDown, ArrowUp, Camera, Plus, Search } from "@/app/site/icons";
import { when } from "../../when";
import { BulkBar } from "./BulkBar";
import { LIST_KEY } from "./BackToProducts";

/** One thing a product needs before it can show, and where in its editor that is fixed. */
export type Need = { kind?: NeedKind; label: string; hint: string; tab: Place; field: string };

export type Row = {
  slug: string;
  name: string;
  code: string;
  categoryId: string;
  status: ProductStatus;
  special: boolean;
  min: number | null;
  max: number | null;
  photo: string | null;
  /** What keeps it out of the shop: "No price", "No photo". Empty when retired. */
  needs: Need[];
  /** The words of its name, codes, SKUs, category and filter labels, as the shop's search reads them. */
  search: string[];
  updatedAt: string;
};

type SortKey = "name" | "category" | "price" | "status" | "updated";
type Initial = { q: string; status: string; category: string; needs: boolean; sort: string; desc: boolean };

const SORT_KEYS: SortKey[] = ["name", "category", "price", "status", "updated"];
const STATUS_RANK: Record<ProductStatus, number> = { active: 0, draft: 1, archived: 2 };

/**
 * The list's views, by where a product stands: in the shop, hidden because
 * it still lacks something, hidden though it has everything (waiting to be
 * switched on, or held back on purpose), or retired. Each product is in
 * exactly one, so no two views repeat each other.
 */
const VIEWS = {
  all: { label: "All", test: () => true },
  active: { label: STATUS_LABELS.active, test: (r: Row) => r.status === "active" },
  unfinished: { label: "Not finished", test: (r: Row) => r.status === "draft" && r.needs.length > 0 },
  ready: { label: "Ready to show", test: (r: Row) => r.status === "draft" && r.needs.length === 0 },
  archived: { label: STATUS_LABELS.archived, test: (r: Row) => r.status === "archived" },
} as const;
type View = keyof typeof VIEWS;
const VIEW_IDS = Object.keys(VIEWS) as View[];

/** A view from the address, reading the older ones too: `status=draft&needs=1` was Not finished. */
function readView({ status, needs }: Pick<Initial, "status" | "needs">): View {
  if (needs || status === "draft") return "unfinished";
  return VIEW_IDS.find((v) => v === status) ?? "all";
}

/**
 * Every product in one dense, searchable table, and the shop's work queue: what
 * keeps a product out of the shop is said on its row, each need a link to the
 * control that fixes it, and Not finished narrows the list to exactly those.
 * Rows can be chosen for the bulk bar. Filters and sort live in the address,
 * so Back returns to the same view.
 */
export function ProductsTable({
  rows,
  categories,
  initial,
  now,
}: {
  rows: Row[];
  categories: { value: string; label: string }[];
  initial: Initial;
  /** The server's clock, so "Today" reads the same in its render and the browser's. */
  now: string;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initial.q);
  const [view, setView] = useState<View>(() => readView(initial));
  const [category, setCategory] = useState<string | null>(categories.some((c) => c.value === initial.category) ? initial.category : null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>(() => {
    const key = SORT_KEYS.find((k) => k === initial.sort);
    return key ? { key, desc: initial.desc } : { key: "name", desc: false };
  });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const query = useDeferredValue(q.trim());

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (view !== "all") params.set("status", view);
    if (category) params.set("category", category);
    if (sort.key !== "name") params.set("sort", sort.key);
    if (sort.desc) params.set("dir", "desc");
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
    // The editor's way back returns to this same view.
    try {
      sessionStorage.setItem(LIST_KEY, search);
    } catch {}
  }, [query, view, category, sort]);

  // "/" finds, "n" starts a new product, as long as nothing is being typed.
  useHotkeys([
    ["/", () => searchRef.current?.focus()],
    ["n", () => router.push("/admin/products/new")],
  ]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.value, c.label])), [categories]);

  // Search and category first; each view then counts against what is left.
  const base = useMemo(() => {
    const words = queryWords(query);
    return rows.filter((r) => (!category || r.categoryId === category) && startsWords(r.search, words));
  }, [rows, category, query]);

  const viewData = useMemo(
    () => VIEW_IDS.map((v) => ({ value: v, label: `${VIEWS[v].label} ${base.filter(VIEWS[v].test).length}` })),
    [base],
  );

  const shown = useMemo(() => {
    const list = base.filter(VIEWS[view].test);
    const byName = (a: Row, b: Row) => a.name.localeCompare(b.name);
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      name: byName,
      category: (a, b) => (categoryName.get(a.categoryId) ?? "").localeCompare(categoryName.get(b.categoryId) ?? "") || byName(a, b),
      // Unpriced products sort last whichever way.
      price: (a, b) => (a.min ?? Infinity) - (b.min ?? Infinity),
      // Within a status, the ones needing most come first.
      status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.needs.length - a.needs.length || byName(a, b),
      updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    };
    const sorted = [...list].sort(by[sort.key]);
    return sort.desc ? sorted.reverse() : sorted;
  }, [base, view, sort, categoryName]);

  // Only what is on screen is acted on, whatever was chosen before a filter changed.
  const chosen = shown.filter((r) => selected.has(r.slug));
  const allChosen = chosen.length > 0 && chosen.length === shown.length;
  const toggle = (slug: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });

  const filtered = Boolean(query || category || view !== "all");
  const clear = () => {
    setQ("");
    setView("all");
    setCategory(null);
  };

  const header = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key;
    return (
      <th className={className} aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}>
        <button
          type="button"
          className="plist__sort"
          onClick={() => setSort({ key, desc: active ? !sort.desc : key === "updated" })}
        >
          {label}
          {active ? sort.desc ? <ArrowDown size={16} /> : <ArrowUp size={16} /> : null}
        </button>
      </th>
    );
  };

  const fixHref = (r: Row, n: Need) => `/admin/products/${r.slug}?tab=${n.tab}&fix=${n.field}`;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Products</h1>
          <p className="page__lede">
            Everything the shop sells. A product shoppers can’t see yet says what it’s missing under its name; click that to fix it.
          </p>
        </div>
        <Button component={Link} href="/admin/products/new" leftSection={<Plus size={20} />} aria-keyshortcuts="n">
          New product
        </Button>
      </header>

      <div className="plist__tools">
        <TextInput
          ref={searchRef}
          className="plist__search"
          placeholder="Search by name, code, category or filter"
          aria-label="Search products"
          aria-keyshortcuts="/"
          leftSection={<Search size={20} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && q) setQ("");
          }}
          rightSection={
            q ? (
              <CloseButton aria-label="Clear search" onClick={() => setQ("")} />
            ) : (
              <kbd className="plist__kbd" aria-hidden="true">
                /
              </kbd>
            )
          }
        />
        <Select
          className="plist__category"
          aria-label="Category"
          placeholder="All categories"
          data={categories}
          value={category}
          onChange={setCategory}
          clearable
        />
        <SegmentedControl className="plist__status" aria-label="Show" value={view} onChange={(v) => setView(v as View)} data={viewData} />
        <Select
          className="plist__statusSelect"
          aria-label="Show"
          data={viewData}
          value={view}
          onChange={(v) => setView((v as View | null) ?? "all")}
          allowDeselect={false}
        />
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <p className="empty__title">
            {!query && !category && view === "unfinished"
              ? "No hidden product is missing anything."
              : !query && !category && view === "ready"
                ? "No hidden product is ready to show. Ones still missing something are under Not finished."
                : filtered
                  ? "No products match."
                  : "No products yet."}
          </p>
          {filtered ? (
            <Button variant="light" onClick={clear}>
              Clear search and filters
            </Button>
          ) : (
            <Button component={Link} href="/admin/products/new" leftSection={<Plus size={20} />}>
              Add the first product
            </Button>
          )}
        </div>
      ) : (
        <div className="plist__wrap">
          <table className="plist">
            <caption className="visually-hidden">
              {shown.length} of {rows.length} products. Column headings sort the table.
            </caption>
            <thead>
              <tr>
                <th className="plist__check">
                  <Checkbox
                    aria-label={allChosen ? "Unselect all shown" : `Select all ${shown.length} shown`}
                    checked={allChosen}
                    indeterminate={chosen.length > 0 && !allChosen}
                    onChange={() => setSelected(allChosen ? new Set() : new Set(shown.map((r) => r.slug)))}
                  />
                </th>
                <th className="plist__thumbCol">
                  <span className="visually-hidden">Photo</span>
                </th>
                {header("name", "Product")}
                {header("category", "Category", "plist__wide")}
                {header("price", "Price", "plist__num plist__priceCol")}
                {header("status", "Status", "plist__statusCol")}
                {header("updated", "Last changed", "plist__wide")}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                // A missing price is said in the price column; the rest under the name.
                const unpriced = r.needs.find((n) => n.kind === "price");
                const needs = r.needs.filter((n) => n !== unpriced);
                return (
                  <tr key={r.slug} className={`plist__row plist__row--${r.status}`} aria-selected={selected.has(r.slug)}>
                    <td className="plist__check">
                      <Checkbox aria-label={`Select ${r.name}`} checked={selected.has(r.slug)} onChange={() => toggle(r.slug)} />
                    </td>
                    <td className="plist__thumbCol">
                      <span className="plist__thumb">
                        {r.photo ? (
                          <ProductImage code={r.photo} alt="" width={400} height={400} sizes="52px" />
                        ) : (
                          <span className="plist__nophoto">
                            <Camera size={22} />
                            <span className="visually-hidden">No photo</span>
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="plist__main">
                      <Link href={`/admin/products/${r.slug}`} className="plist__name">
                        {r.name}
                      </Link>
                      <span className="plist__code">{r.code}</span>
                      {needs.length ? (
                        <span className="plist__flags">
                          <span className="visually-hidden">Missing:</span>
                          {needs.map((n) => (
                            <Link key={n.field} href={fixHref(r, n)} className="flag" title={n.hint}>
                              <Alert size={14} />
                              {n.label}
                            </Link>
                          ))}
                        </span>
                      ) : null}
                    </td>
                    <td className="plist__wide">{categoryName.get(r.categoryId) ?? r.categoryId}</td>
                    <td className="plist__num plist__priceCol">
                      {unpriced ? (
                        <Link href={fixHref(r, unpriced)} className="flag" title={unpriced.hint}>
                          <Alert size={14} />
                          {unpriced.label}
                        </Link>
                      ) : r.min === null ? (
                        <span className="plist__none">{NEED_LABELS.price}</span>
                      ) : (
                        priceLabel(r)
                      )}
                    </td>
                    <td className="plist__statusCol">
                      <span className={`status status--${r.status}`}>{STATUS_LABELS[r.status]}</span>
                      {r.special ? <span className="special">Special</span> : null}
                    </td>
                    <td className="plist__wide plist__date">{when(r.updatedAt, now)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BulkBar
        slugs={chosen.map((r) => r.slug)}
        onClear={() => setSelected(new Set())}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
