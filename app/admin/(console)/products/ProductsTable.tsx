"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button, CloseButton, SegmentedControl, Select, TextInput } from "@mantine/core";
import { STATUS_LABELS } from "@/lib/catalog/edit";
import { priceLabel } from "@/lib/catalog/listing";
import type { ProductStatus } from "@/lib/catalog/types";
import { ProductImage } from "@/app/site/ProductImage";
import { ArrowDown, ArrowUp, Plus, Search } from "@/app/site/icons";

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
  /** What keeps it out of the shop: "No price", "No photo". */
  flags: string[];
  updatedAt: string;
};

type SortKey = "name" | "category" | "price" | "updated";
type Filters = { q: string; status: string; category: string };

const STATUSES: ProductStatus[] = ["active", "draft", "archived"];

/**
 * Every product in one dense, searchable table. A row is a door into its
 * editor; what keeps a product out of the shop is said on its row in a word
 * or two, so the work left to do is visible before anything is opened. The
 * filters live in the address, so Back returns to the same view.
 */
export function ProductsTable({
  rows,
  categories,
  initial,
}: {
  rows: Row[];
  categories: { value: string; label: string }[];
  initial: Filters;
}) {
  const [q, setQ] = useState(initial.q);
  const [status, setStatus] = useState(STATUSES.includes(initial.status as ProductStatus) ? initial.status : "all");
  const [category, setCategory] = useState<string | null>(categories.some((c) => c.value === initial.category) ? initial.category : null);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "name", desc: false });
  const query = useDeferredValue(q.trim().toLowerCase());

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (category) params.set("category", category);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [q, status, category]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.value, c.label])), [categories]);

  // Counts follow the search and category, so each status says what it would show.
  const matching = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!category || r.categoryId === category) &&
          (!query || r.name.toLowerCase().includes(query) || r.code.toLowerCase().includes(query)),
      ),
    [rows, category, query],
  );

  const shown = useMemo(() => {
    const list = matching.filter((r) => status === "all" || r.status === status);
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      category: (a, b) => (categoryName.get(a.categoryId) ?? "").localeCompare(categoryName.get(b.categoryId) ?? "") || a.name.localeCompare(b.name),
      // Unpriced products sort last whichever way.
      price: (a, b) => (a.min ?? Infinity) - (b.min ?? Infinity),
      updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    };
    const sorted = [...list].sort(by[sort.key]);
    return sort.desc ? sorted.reverse() : sorted;
  }, [matching, status, sort, categoryName]);

  const count = (s: string) => (s === "all" ? matching.length : matching.filter((r) => r.status === s).length);
  const filtered = Boolean(query || category || status !== "all");
  const clear = () => {
    setQ("");
    setStatus("all");
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

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="page__title">Products</h1>
        <Button component={Link} href="/admin/products/new" leftSection={<Plus size={20} />}>
          New product
        </Button>
      </header>

      <div className="plist__tools">
        <TextInput
          className="plist__search"
          placeholder="Search by name or code"
          aria-label="Search products"
          leftSection={<Search size={20} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          rightSection={q ? <CloseButton aria-label="Clear search" onClick={() => setQ("")} /> : null}
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
        <SegmentedControl
          className="plist__status"
          aria-label="Status"
          value={status}
          onChange={setStatus}
          data={[
            { value: "all", label: `All ${count("all")}` },
            ...STATUSES.map((s) => ({ value: s, label: `${STATUS_LABELS[s]} ${count(s)}` })),
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{filtered ? "No products match." : "No products yet."}</p>
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
                <th className="plist__thumbCol">
                  <span className="visually-hidden">Photo</span>
                </th>
                {header("name", "Product")}
                {header("category", "Category", "plist__wide")}
                {header("price", "Price", "plist__num")}
                <th>Status</th>
                {header("updated", "Last changed", "plist__wide")}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.slug} className="plist__row">
                  <td className="plist__thumbCol">
                    <span className="plist__thumb">
                      {r.photo ? <ProductImage code={r.photo} alt="" width={400} height={400} sizes="52px" /> : null}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/products/${r.slug}`} className="plist__name">
                      {r.name}
                    </Link>
                    <span className="plist__code">{r.code}</span>
                    {r.flags.length ? (
                      <span className="plist__flags">
                        {r.flags.map((f) => (
                          <span key={f} className="flag">
                            {f}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </td>
                  <td className="plist__wide">{categoryName.get(r.categoryId) ?? r.categoryId}</td>
                  <td className="plist__num">{r.min === null ? <span className="plist__none">Not priced</span> : priceLabel(r)}</td>
                  <td>
                    <span className={`status status--${r.status}`}>{STATUS_LABELS[r.status]}</span>
                    {r.special ? <span className="special">Special</span> : null}
                  </td>
                  <td className="plist__wide plist__date">{when(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** In the shop's own time zone, so the server's render and the browser's agree. */
const TZ = "Africa/Johannesburg";
const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/** "Today, 14:05", "Yesterday", "3 Oct 2026". */
function when(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (day(d) === day(now)) return `Today, ${d.toLocaleTimeString("en-ZA", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })}`;
  if (day(d) === day(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return d.toLocaleDateString("en-ZA", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}
