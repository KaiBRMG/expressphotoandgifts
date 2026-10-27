"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CloseButton, SegmentedControl, Select, TextInput, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { itemCount, rands } from "@/lib/catalog/listing";
import { queryWords, startsWords, words } from "@/lib/catalog/search";
import { REF, stageLabel } from "@/lib/checkout/order";
import type { OrderRow } from "@/lib/admin/orders";
import { Alert, Search } from "@/app/site/icons";
import { when } from "../../when";

/**
 * The views, by what the shop has to do: orders still to make or hand over,
 * orders with something to look at (a payment that didn't match, money taken
 * twice), and orders done. An order flagged is in Needs a look as well as
 * wherever its stage puts it, so it is never out of sight.
 */
const VIEWS = {
  todo: { label: "To do", test: (r: OrderRow) => r.paid && r.stage !== "done" && r.stage !== "cancelled" },
  look: { label: "Needs a look", test: (r: OrderRow) => r.flagged },
  done: { label: "Done", test: (r: OrderRow) => r.paid && (r.stage === "done" || r.stage === "cancelled") },
  all: { label: "All", test: () => true },
} as const;
type View = keyof typeof VIEWS;
const VIEW_IDS = Object.keys(VIEWS) as View[];

/** Within To do, the stage a shop works one at a time: print the New, pack the Ready. */
const STAGES = [
  { id: "new", label: "New", hint: "Paid and waiting to be made." },
  { id: "making", label: "Being made", hint: "Started. Mark it ready when it is done." },
  { id: "ready", label: "Ready", hint: "Made, waiting to be collected or sent." },
] as const;
type StageFilter = (typeof STAGES)[number]["id"];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function OrdersTable({ rows, initial, now }: { rows: OrderRow[]; initial: { q: string; view: string; stage: string }; now: string }) {
  const [q, setQ] = useState(initial.q);
  const [view, setView] = useState<View>(() => VIEW_IDS.find((v) => v === initial.view) ?? "todo");
  const [stage, setStage] = useState<StageFilter | "">(() => STAGES.find((s) => s.id === initial.stage)?.id ?? "");
  const query = useDeferredValue(q.trim());
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" finds, as long as nothing is being typed.
  useHotkeys([["/", () => searchRef.current?.focus()]]);

  // A stage only narrows To do; choosing another view lets go of it.
  const stageNow = view === "todo" ? stage : "";

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (view !== "todo") params.set("view", view);
    if (stageNow) params.set("stage", stageNow);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [query, view, stageNow]);

  const searchable = useMemo(() => new Map(rows.map((r) => [r.ref, words([r.ref, r.name, r.email, r.phone].join(" "))])), [rows]);
  const base = useMemo(() => {
    const w = queryWords(query);
    return rows.filter((r) => startsWords(searchable.get(r.ref)!, w));
  }, [rows, query, searchable]);
  const viewData = VIEW_IDS.map((v) => ({ value: v, label: `${VIEWS[v].label} ${base.filter(VIEWS[v].test).length}` }));
  // To do reads oldest first: the order waiting longest is the one to make next.
  const shown = useMemo(() => {
    const list = base.filter(VIEWS[view].test).filter((r) => !stageNow || r.stage === stageNow);
    return view === "todo" ? [...list].reverse() : list;
  }, [base, view, stageNow]);
  const todo = useMemo(() => base.filter(VIEWS.todo.test), [base]);
  // An order number typed whole opens that order, even one too old for the list.
  const typedRef = REF.test(query.toUpperCase()) && !rows.some((r) => r.ref === query.toUpperCase()) ? query.toUpperCase() : null;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Orders</h1>
          <p className="page__lede">Paid orders, and anything that needs a look. To do lists the order waiting longest first.</p>
        </div>
      </header>

      <div className="plist__tools">
        <TextInput
          className="plist__search"
          placeholder="Search by order number, name, email or phone"
          aria-label="Search orders"
          leftSection={<Search size={20} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          ref={searchRef}
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
        <SegmentedControl className="plist__status" aria-label="Show" value={view} onChange={(v) => setView(v as View)} data={viewData} />
        <Select className="plist__statusSelect" aria-label="Show" data={viewData} value={view} onChange={(v) => setView((v as View | null) ?? "todo")} allowDeselect={false} />
      </div>

      {view === "todo" ? (
        <div className="stagechips" role="group" aria-label="Stage">
          <button type="button" className="stagechip" aria-pressed={!stage} onClick={() => setStage("")}>
            Any stage <span className="stagechip__n">{todo.length}</span>
          </button>
          {STAGES.map((s) => (
            <Tooltip key={s.id} label={s.hint} openDelay={300} events={{ hover: true, focus: true, touch: false }}>
              <button type="button" className="stagechip" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>
                <span className={`status ostage--${s.id}`}>{s.label}</span> <span className="stagechip__n">{todo.filter((r) => r.stage === s.id).length}</span>
              </button>
            </Tooltip>
          ))}
        </div>
      ) : null}

      {typedRef ? (
        <p className="olist__jump">
          <Link className="admin-link" href={`/admin/orders/${typedRef}`}>
            Open order {typedRef}
          </Link>
        </p>
      ) : null}

      {shown.length === 0 ? (
        <div className="empty">
          <p className="empty__title">
            {query ? "No orders match." : view === "todo" ? (stageNow ? `Nothing is ${STAGES.find((s) => s.id === stageNow)!.label.toLowerCase()} right now.` : "Nothing to make. Every paid order is done.") : view === "look" ? "Nothing needs a look." : "No orders yet."}
          </p>
        </div>
      ) : (
        <div className="plist__wrap">
          <table className="plist">
            <caption className="visually-hidden">{shown.length} orders</caption>
            <thead>
              <tr>
                <th>Order</th>
                <th className="plist__wide">Paid</th>
                <th className="plist__wide">How</th>
                <th className="plist__num">Total</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.ref} className="plist__row olist__row">
                  <td className="plist__main">
                    <Link href={`/admin/orders/${r.ref}`} className="plist__name">
                      {r.name}
                    </Link>
                    <span className="plist__what">{r.what || "Order"}</span>
                    <span className="plist__code">
                      {r.ref} · {itemCount(r.units)}
                      {r.photos ? ` · ${plural(r.photos, "photo", "photos")}` : ""}
                    </span>
                    {r.flagged ? (
                      <span className="plist__flags">
                        <Tooltip label="A payment didn’t match the order, or money was taken twice. Open the order to see which." openDelay={300} events={{ hover: true, focus: false, touch: false }}>
                          <span className="flag">
                            <Alert size={14} />
                            Needs a look
                          </span>
                        </Tooltip>
                      </span>
                    ) : null}
                  </td>
                  <td className="plist__wide plist__date">{r.paid ? when(r.at, now) : "Not paid"}</td>
                  <td className="plist__wide">{r.method === "collect" ? "Collect" : "Courier"}</td>
                  <td className="plist__num olist__total">
                    {rands(r.total)}
                    {r.refunded ? <span className="olist__refund">{r.refunded >= r.total ? "Refunded" : `${rands(r.refunded)} refunded`}</span> : null}
                  </td>
                  <td className="olist__stage">
                    {r.paid && r.stage ? (
                      <span className={`status ostage--${r.stage}`}>{stageLabel(r.stage, r.method)}</span>
                    ) : (
                      <span className="status status--archived">Not paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
