"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CloseButton, SegmentedControl, Select, TextInput } from "@mantine/core";
import { rands } from "@/lib/catalog/listing";
import { queryWords, startsWords, words } from "@/lib/catalog/search";
import { REF } from "@/lib/checkout/order";
import type { CustomerRow } from "@/lib/admin/customers";
import { Download, Search } from "@/app/site/icons";
import { when } from "../../when";

/** Two paid orders or more: someone who came back. */
const REGULAR = 2;

/**
 * The views, by why staff came: everyone who has paid, latest order first;
 * the regulars, who spent most first; and who may be sent marketing email,
 * which counts accounts that have never ordered (the footer's sign-up).
 */
const VIEWS = {
  all: { label: "All", test: (r: CustomerRow) => r.orders > 0 },
  regulars: { label: "Regulars", test: (r: CustomerRow) => r.orders >= REGULAR },
  marketing: { label: "Marketing email", test: (r: CustomerRow) => r.marketing },
} as const;
type View = keyof typeof VIEWS;
const VIEW_IDS = Object.keys(VIEWS) as View[];

const LEDES: Record<View, string> = {
  all: "Everyone who has paid for an order, by email, the latest order first. Find someone by name, email, mobile or an order number.",
  regulars: `Customers with ${REGULAR} paid orders or more, who spent most first.`,
  marketing: "Customers who agreed to marketing email and haven’t withdrawn it. Only they may be sent specials and campaigns.",
};

const EMPTY: Record<View, { title: string; lede?: string }> = {
  all: { title: "No customers yet." },
  regulars: { title: "No one has come back for a second order yet." },
  marketing: { title: "No one has agreed to marketing email yet.", lede: "Customers agree in the footer’s sign-up or on their account page." },
};

export function CustomersTable({ rows, initial, now }: { rows: CustomerRow[]; initial: { q: string; view: string }; now: string }) {
  const [q, setQ] = useState(initial.q);
  const [view, setView] = useState<View>(() => VIEW_IDS.find((v) => v === initial.view) ?? "all");
  const query = useDeferredValue(q.trim());

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (view !== "all") params.set("view", view);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [query, view]);

  const searchable = useMemo(() => new Map(rows.map((r) => [r.key, words([r.name, r.email, r.phone, ...r.refs].join(" "))])), [rows]);
  const base = useMemo(() => {
    const w = queryWords(query);
    return rows.filter((r) => startsWords(searchable.get(r.key)!, w));
  }, [rows, query, searchable]);
  const viewData = VIEW_IDS.map((v) => ({ value: v, label: `${VIEWS[v].label} ${base.filter(VIEWS[v].test).length}` }));
  const shown = useMemo(() => {
    const list = base.filter(VIEWS[view].test);
    return view === "regulars" ? [...list].sort((a, b) => b.spent - a.spent) : list;
  }, [base, view]);
  // An order number no customer here has (unpaid, say) still opens its order.
  const typed = query.toUpperCase();
  const typedRef = REF.test(typed) && !rows.some((r) => r.refs.includes(typed)) ? typed : null;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Customers</h1>
          <p className="page__lede">{LEDES[view]}</p>
        </div>
        {view === "marketing" ? (
          <a className="obtn" href="/admin/customers/export" download>
            <Download size={18} />
            Download the email list
          </a>
        ) : null}
      </header>

      <div className="plist__tools">
        <TextInput
          className="plist__search"
          placeholder="Search by name, email, mobile or order number"
          aria-label="Search customers"
          leftSection={<Search size={20} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && q) setQ("");
          }}
          rightSection={q ? <CloseButton aria-label="Clear search" onClick={() => setQ("")} /> : null}
        />
        <SegmentedControl className="plist__status" aria-label="Show" value={view} onChange={(v) => setView(v as View)} data={viewData} />
        <Select className="plist__statusSelect" aria-label="Show" data={viewData} value={view} onChange={(v) => setView((v as View | null) ?? "all")} allowDeselect={false} />
      </div>

      {typedRef ? (
        <p className="olist__jump">
          <Link className="admin-link" href={`/admin/orders/${typedRef}`}>
            Open order {typedRef}
          </Link>
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="empty">
          <p className="empty__title">{query ? "No customers match." : EMPTY[view].title}</p>
          {query ? (
            <p className="empty__lede">Search finds the start of a name, an email, a mobile number or an order number. A customer who never paid is found by their order on the Orders page.</p>
          ) : EMPTY[view].lede ? (
            <p className="empty__lede">{EMPTY[view].lede}</p>
          ) : null}
        </div>
      ) : (
        <div className="plist__wrap">
          <table className="plist">
            <caption className="visually-hidden">{shown.length} customers</caption>
            <thead>
              <tr>
                <th>Customer</th>
                <th className="plist__wide">Mobile</th>
                <th className="plist__num clist__num">Orders</th>
                <th className="plist__num clist__num">Spent</th>
                <th className="plist__wide">Last order</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key} className="plist__row">
                  <td className="plist__main">
                    <Link href={`/admin/customers/${r.key}`} className="plist__name">
                      {r.name || r.email}
                    </Link>
                    {r.name ? <span className="plist__code clist__email">{r.email}</span> : null}
                    {r.account || r.marketing ? (
                      <span className="clist__tags">
                        {r.account ? <span className="ochip ochip--quiet clist__tag">Account</span> : null}
                        {r.marketing ? <span className="ochip clist__tag">Marketing email</span> : null}
                      </span>
                    ) : null}
                  </td>
                  <td className="plist__wide clist__phone mono">{r.phone || <span className="plist__none">None</span>}</td>
                  <td className="plist__num clist__num">{r.orders}</td>
                  <td className="plist__num clist__num">
                    {r.orders ? rands(r.spent) : <span className="plist__none">None</span>}
                    {r.refunded ? <span className="olist__refund">{rands(r.refunded)} refunded</span> : null}
                  </td>
                  <td className="plist__wide plist__date">{r.last ? when(r.last, now) : "No orders"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
