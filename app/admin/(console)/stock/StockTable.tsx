"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Button, CloseButton, Drawer, Loader, NumberInput, SegmentedControl, Select, Switch, TextInput, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { orderWhat } from "@/lib/catalog/purchase";
import { queryWords, startsWords, words } from "@/lib/catalog/search";
import { applyEdit, LOW_MARGIN, MAX_COUNT, STATE_LABELS, stockState, type StockEdit, type StockLevel, type StockState } from "@/lib/catalog/stock";
import type { HistoryLine, StockRow } from "@/lib/admin/stock";
import { ProductImage } from "@/app/site/ProductImage";
import { Alert, Camera, Check, Clock, Search } from "@/app/site/icons";
import { saveStockAction, stockHistoryAction } from "../../actions";
import { useLeaveGuard } from "../../editor/useLeaveGuard";
import { at, when } from "../../when";

/** A row's edit as typed: each field only once touched; "" is a field cleared. */
type Draft = { tracked?: boolean; receive?: number | ""; count?: number | ""; soldOutAt?: number | ""; lowAt?: number | "" };
type Num = number | "";

/**
 * The page's views, by what needs doing: what's low, what's sold out, what's
 * tracked, and what isn't (always orderable). Read from the saved levels, so
 * a row doesn't leave the view while its numbers are being typed.
 */
const VIEWS = {
  all: { label: "All", test: () => true },
  low: { label: "Low", test: (s: StockState) => s === "low" || s === "out" },
  out: { label: "Sold out", test: (s: StockState) => s === "out" },
  tracked: { label: "Tracked", test: (s: StockState) => s !== "untracked" },
  untracked: { label: "Not tracked", test: (s: StockState) => s === "untracked" },
} as const;
type View = keyof typeof VIEWS;
const VIEW_IDS = Object.keys(VIEWS) as View[];

/** Problems first: sold out, then low, then in stock, then what isn't tracked. */
const RANK: Record<StockState, number> = { out: 0, low: 1, in: 2, untracked: 3 };

type SaveState = { kind: "idle" } | { kind: "saved"; count: number } | { kind: "error"; message: string; skus: string[] };

const num = (v: Num | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * The edit a draft makes against its saved level, or null when it changes
 * nothing; `problem` when it can't be saved as it stands.
 */
type Edited = { edit: StockEdit | null; level: StockLevel | null; problem?: string; tracked: boolean; starting: boolean };

function toEdit(sku: string, d: Draft | undefined, was: StockLevel | null): Edited {
  const tracked = d?.tracked ?? was?.tracked ?? false;
  const starting = tracked && !was?.tracked;
  const same = { edit: null, level: was, tracked, starting };
  if (!d) return same;
  const edit: StockEdit = { sku, expected: was?.onHand ?? null };
  if (tracked !== (was?.tracked ?? false)) edit.tracked = tracked;
  if (tracked && num(d.receive) && d.receive > 0) edit.receive = d.receive;
  else if (tracked && num(d.count) && (starting || d.count !== was?.onHand)) edit.count = d.count;
  if (tracked && num(d.soldOutAt) && d.soldOutAt !== was?.soldOutAt) edit.soldOutAt = d.soldOutAt;
  if (tracked && num(d.lowAt) && d.lowAt !== was?.lowAt) edit.lowAt = d.lowAt;
  // A tracked size starting from nothing would sell out the moment it saved, so it is counted first.
  if (starting && edit.count === undefined && edit.receive === undefined) return { edit, level: null, problem: "Count it to start tracking.", tracked, starting };
  if (Object.keys(edit).length === 2) return same;
  const r = applyEdit(was ?? undefined, edit);
  return "error" in r ? { edit, level: null, problem: r.error, tracked, starting } : { edit, level: r.level, tracked, starting };
}

/**
 * Every size of every product with what is on the shelf, and the work on it:
 * receive a delivery (type into Receive, down the column, Enter to go on),
 * correct a count, set where it sells out and where it warns, and switch
 * tracking on or off. Changes wait in the save bar and go in one save; each
 * leaves a line in the size's history. Filters live in the address, so the
 * low-stock email can open on the low ones.
 */
export function StockTable({ rows, initial, now }: { rows: StockRow[]; initial: { q: string; show: string }; now: string }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initial.q);
  const [view, setView] = useState<View>(() => VIEW_IDS.find((v) => v === initial.show) ?? "all");
  const [saved, setSaved] = useState<Record<string, StockLevel | null>>(() => Object.fromEntries(rows.map((r) => [r.sku, r.level])));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [history, setHistory] = useState<{ row: StockRow; lines: HistoryLine[] | null } | null>(null);
  const query = useDeferredValue(q.trim());

  // A refresh (after a conflict) brings the latest counts; drafts are kept.
  const [seen, setSeen] = useState(rows);
  if (seen !== rows) {
    setSeen(rows);
    setSaved(Object.fromEntries(rows.map((r) => [r.sku, r.level])));
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (view !== "all") params.set("show", view);
    const search = params.toString();
    window.history.replaceState(window.history.state, "", search ? `?${search}` : window.location.pathname);
  }, [query, view]);

  // Only rows with a draft can hold an edit; each Row works out its own for drawing.
  const edits = useMemo(
    () =>
      rows.flatMap((r) => {
        if (!drafts[r.sku]) return [];
        const e = toEdit(r.sku, drafts[r.sku], saved[r.sku]);
        return e.edit || e.problem ? [{ row: r, ...e }] : [];
      }),
    [rows, drafts, saved],
  );
  const problems = edits.filter((e) => e.problem);
  const dirty = edits.length > 0;
  useLeaveGuard(dirty);

  // Stable, so a row redraws only when its own values change.
  const draft = useCallback((sku: string, patch: Draft) => {
    setDrafts((d) => ({ ...d, [sku]: { ...d[sku], ...patch } }));
    setState((s) => (s.kind === "saved" ? { kind: "idle" } : s));
  }, []);

  const discard = () => {
    setDrafts({});
    setState({ kind: "idle" });
  };

  const save = async () => {
    if (!dirty || saving) return;
    if (problems.length) {
      document.querySelector<HTMLElement>(`[data-sku="${CSS.escape(problems[0].row.sku)}"] input:not([disabled])`)?.focus();
      return;
    }
    setSaving(true);
    const result = await saveStockAction(edits.map((e) => e.edit!)).catch((): { error: string; skus?: string[] } => ({ error: "The save didn’t reach the server. Check your connection and try again." }));
    setSaving(false);
    if ("ok" in result) {
      setSaved((s) => ({ ...s, ...result.levels }));
      setDrafts({});
      setState({ kind: "saved", count: Object.keys(result.levels).length });
      return;
    }
    setState({ kind: "error", message: result.error, skus: result.skus ?? [] });
  };

  /** After a conflict: the latest counts, and the counts typed over them dropped, to be counted again. */
  const reload = () => {
    if (state.kind !== "error") return;
    const stale = new Set(state.skus);
    setDrafts((d) => Object.fromEntries(Object.entries(d).map(([sku, x]) => [sku, stale.has(sku) ? { ...x, count: undefined } : x])));
    setState({ kind: "idle" });
    router.refresh();
  };

  useHotkeys([["/", () => searchRef.current?.focus()]]);
  // Saves from inside a field too.
  useHotkeys([["mod+S", () => void save()]], []);

  const openHistory = useCallback(async (row: StockRow) => {
    setHistory({ row, lines: null });
    const lines = await stockHistoryAction(row.sku).catch(() => []);
    setHistory((h) => (h?.row.sku === row.sku ? { row, lines } : h));
  }, []);

  // Search first; each view then counts against what's left.
  const base = useMemo(() => {
    const qw = queryWords(query);
    return rows.filter((r) => startsWords([r.product, r.code, r.sku, r.variant ?? ""].flatMap(words), qw));
  }, [rows, query]);
  // `saved` changes only on a save or refresh, so counts and order move then, not while typing.
  const { viewData, groups } = useMemo(() => {
    const stateOf = (r: StockRow) => stockState(saved[r.sku] ?? undefined);
    const viewData = VIEW_IDS.map((v) => ({ value: v, label: `${VIEWS[v].label} ${base.filter((r) => VIEWS[v].test(stateOf(r))).length}` }));
    // Grouped by product, each group led by its worst size.
    const by = new Map<string, { rows: StockRow[]; worst: number }>();
    for (const r of base) {
      const st = stateOf(r);
      if (!VIEWS[view].test(st)) continue;
      const g = by.get(r.slug) ?? by.set(r.slug, { rows: [], worst: Infinity }).get(r.slug)!;
      g.rows.push(r);
      g.worst = Math.min(g.worst, RANK[st]);
    }
    const groups = [...by.values()].sort((a, b) => a.worst - b.worst || a.rows[0].product.localeCompare(b.rows[0].product)).map((g) => g.rows);
    return { viewData, groups };
  }, [base, view, saved]);

  const tracked = rows.filter((r) => saved[r.sku]?.tracked).length;
  const received = edits.reduce((n, e) => n + (e.edit?.receive ?? 0), 0);
  const stale = state.kind === "error" ? state.skus : [];

  return (
    <div className="page page--stock">
      <header className="page__head">
        <div>
          <h1 className="page__title">Stock</h1>
          <p className="page__lede">
            What’s on the shelf, size by size. A tracked size sells down to its Sold out level, then shows Sold out in the shop;
            paid orders take stock off as they come in. A size that isn’t tracked can always be ordered.
          </p>
        </div>
      </header>

      <div className="plist__tools">
        <TextInput
          ref={searchRef}
          className="plist__search"
          placeholder="Search by product, code or SKU"
          aria-label="Search stock"
          aria-keyshortcuts="/"
          leftSection={<Search size={20} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && q) setQ("");
          }}
          rightSection={q ? <CloseButton aria-label="Clear search" onClick={() => setQ("")} /> : <kbd className="plist__kbd" aria-hidden="true">/</kbd>}
        />
        <SegmentedControl className="plist__status" aria-label="Show" value={view} onChange={(v) => setView(v as View)} data={viewData} />
        <Select className="plist__statusSelect" aria-label="Show" data={viewData} value={view} onChange={(v) => setView((v as View | null) ?? "all")} allowDeselect={false} />
      </div>

      {tracked === 0 && view === "all" && !query ? (
        <p className="stk__start">
          Nothing is tracked yet, so everything can be ordered. Switch on <strong>Track</strong> for a size you keep a set number of,
          count it, and save.
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className="empty">
          <p className="empty__title">
            {query ? "Nothing matches." : view === "low" ? "Nothing is running low." : view === "out" ? "Nothing is sold out." : view === "tracked" ? "Nothing is tracked yet." : "Every size is tracked."}
          </p>
          {query || view !== "all" ? (
            <Button
              variant="light"
              onClick={() => {
                setQ("");
                setView("all");
              }}
            >
              Show everything
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="plist__wrap">
          <table className="stk">
            <caption className="visually-hidden">Stock for each size, grouped by product. Receive adds to what’s on hand; On hand sets it.</caption>
            <thead>
              <tr>
                <th>Size</th>
                <th>Track</th>
                <th className="stk__numCol">Receive</th>
                <th className="stk__numCol">On hand</th>
                <th className="stk__numCol">Sold out at</th>
                <th className="stk__numCol">Low at</th>
                <th>Status</th>
                <th>
                  <span className="visually-hidden">History</span>
                </th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g[0].slug} className="stk__group">
                <tr className="stk__product">
                  <th colSpan={8} scope="rowgroup">
                    <span className="stk__productInner">
                      <span className="plist__thumb stk__thumb">
                        {g[0].photo ? (
                          <ProductImage code={g[0].photo} alt="" width={400} height={400} sizes="40px" />
                        ) : (
                          <span className="plist__nophoto">
                            <Camera size={18} />
                          </span>
                        )}
                      </span>
                      <Link href={`/admin/products/${g[0].slug}`} className="stk__name">
                        {g[0].product}
                      </Link>
                      <span className="plist__code">{g[0].code}</span>
                      {g[0].hidden ? <span className="stk__hidden">Hidden from the shop</span> : null}
                    </span>
                  </th>
                </tr>
                {g.map((r) => (
                  <Row
                    key={r.sku}
                    row={r}
                    was={saved[r.sku]}
                    draft={drafts[r.sku]}
                    stale={stale.includes(r.sku)}
                    onDraft={draft}
                    onHistory={openHistory}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {state.kind === "error" ? (
        <div className="savebar savebar--alert" role="alert">
          <p className="savebar__text">
            <Alert size={20} />
            <span>{state.message}</span>
          </p>
          <div className="savebar__actions">
            {state.skus.length ? <Button onClick={reload}>Load the latest counts</Button> : <Button onClick={save} loading={saving}>Try again</Button>}
          </div>
        </div>
      ) : dirty ? (
        <div className="savebar savebar--dirty" role="region" aria-label="Unsaved changes">
          <div className="savebar__text">
            {problems.length ? (
              <p className="savebar__problems" role="alert">
                <Alert size={20} />
                <span>
                  {problems.length === 1 ? `${problems[0].row.sku}: ${problems[0].problem}` : `${problems.length} rows need another look; they’re marked in the table.`}
                </span>
              </p>
            ) : (
              <p>
                <span className="savebar__mark" aria-hidden="true" />
                <span>
                  {edits.length === 1 ? "1 size changed" : `${edits.length} sizes changed`}
                  {received ? `, receiving ${received} ${received === 1 ? "unit" : "units"}` : ""}.
                  <span className="savebar__queue">The shop’s Sold out and cart limits follow as soon as it’s saved.</span>
                </span>
              </p>
            )}
          </div>
          <div className="savebar__actions">
            <Button variant="subtle" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button onClick={save} loading={saving} disabled={problems.length > 0}>
              Save
            </Button>
          </div>
        </div>
      ) : state.kind === "saved" ? (
        <div className="savebar savebar--done" role="status">
          <p className="savebar__text">
            <Check size={20} />
            <span>Saved {state.count === 1 ? "1 size" : `${state.count} sizes`}. The shop shows the new stock now.</span>
          </p>
        </div>
      ) : null}

      <Drawer
        opened={history !== null}
        onClose={() => setHistory(null)}
        position="right"
        title={
          history ? (
            <>
              <span>{orderWhat(history.row.product, history.row.variant)}</span>
              <span className="plist__code">{history.row.sku}</span>
            </>
          ) : null
        }
        classNames={{ title: "stk__drawerTitle" }}
      >
        {history?.lines === null ? (
          <Loader size="sm" aria-label="Loading its history" />
        ) : history?.lines.length === 0 ? (
          <p className="hint">Nothing has changed its stock yet.</p>
        ) : (
          <ol className="stk__history">
            {history?.lines.map((m, i) => (
              <li key={`${m.at}-${i}`}>
                <span className="stk__hwhat">
                  {m.label}
                  {m.change ? <span className={`stk__change${m.change < 0 ? " stk__change--off" : ""}`}>{m.change > 0 ? `+${m.change}` : `−${-m.change}`}</span> : null}
                </span>
                {m.note ? <span className="stk__hnote">{m.note}</span> : null}
                <span className="stk__hmeta">
                  {m.kind === "levels" || m.kind === "tracking" ? "" : `${m.onHand} on hand · `}
                  {at(m.at)} · {m.ref ? <Link href={`/admin/orders/${m.ref}`}>Order {m.ref}</Link> : m.by === "shop" ? "the shop" : m.by}
                </span>
              </li>
            ))}
          </ol>
        )}
        {history && history.row.updatedAt ? <p className="hint stk__hlast">Last changed {when(history.row.updatedAt, now).toLowerCase()}.</p> : null}
      </Drawer>
    </div>
  );
}

/** Moves to the next row's Receive on Enter, so a delivery is typed straight down the column. */
function nextReceive(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const all = [...document.querySelectorAll<HTMLInputElement>("input[data-receive]:not([disabled])")];
  all[all.indexOf(e.currentTarget) + 1]?.focus();
}

/** One size's row: drawn again only when its own values change, so typing in one doesn't redraw the table. */
const Row = memo(function Row({
  row,
  was,
  draft,
  stale,
  onDraft: draftFor,
  onHistory: historyOf,
}: {
  row: StockRow;
  was: StockLevel | null;
  draft: Draft | undefined;
  /** Its count moved since the page loaded, so the save was refused. */
  stale: boolean;
  onDraft: (sku: string, d: Draft) => void;
  onHistory: (row: StockRow) => void;
}) {
  const onDraft = (d: Draft) => draftFor(row.sku, d);
  const name = row.variant ?? "One size";
  const edited = toEdit(row.sku, draft, was);
  // The level it would save (null while it can't), and whether it is tracked or starting to be.
  const { tracked, starting, level } = edited;
  const changed = Boolean(edited.edit || edited.problem);
  const problem = edited.problem ?? (stale ? "Changed since you opened the page." : undefined);
  const receiving = num(draft?.receive) && draft.receive > 0;
  const counting = num(draft?.count) && draft.count !== was?.onHand;
  const shown = level ?? (was?.tracked ? was : null);
  const st = tracked ? stockState(shown ?? undefined) : "untracked";
  const soldOutAt = draft?.soldOutAt ?? was?.soldOutAt ?? 0;
  const field = (label: string) => `${label}, ${row.product} ${name}`;
  const box = { hideControls: true, allowDecimal: false, allowNegative: false, min: 0, max: MAX_COUNT, size: "sm" as const, clampBehavior: "strict" as const };

  return (
    <tr className="stk__row" data-sku={row.sku} data-changed={changed || undefined} data-flagged={problem ? true : undefined}>
      <td className="stk__size" data-label="Size">
        <span className="stk__sizeName">{name}</span>
        <span className="plist__code">{row.sku}</span>
        {problem ? (
          <span className="stk__problem" role="alert">
            <Alert size={14} />
            {problem}
          </span>
        ) : null}
      </td>
      <td className="stk__track" data-label="Track">
        <Switch
          checked={tracked}
          aria-label={field("Track stock")}
          onChange={(e) => {
            const on = e.currentTarget.checked;
            onDraft({ tracked: on, ...(on && !was?.tracked ? { count: "", receive: "" } : {}) });
            // Straight to the count it needs before it can be saved.
            if (on && !was?.tracked) requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-sku="${CSS.escape(row.sku)}"] input[data-count]`)?.focus());
          }}
        />
      </td>
      {tracked ? (
        <>
          <td className="stk__num" data-label="Receive">
            <NumberInput
              {...box}
              min={1}
              placeholder="+"
              aria-label={field("Receive")}
              value={draft?.receive ?? ""}
              disabled={counting || starting}
              onChange={(v) => onDraft({ receive: v as Num })}
              onKeyDown={nextReceive}
              data-receive
            />
          </td>
          <td className="stk__num" data-label="On hand">
            <NumberInput
              {...box}
              aria-label={field("On hand")}
              placeholder={starting ? "Count" : undefined}
              value={receiving ? (was?.onHand ?? 0) + (draft!.receive as number) : (draft?.count ?? was?.onHand ?? "")}
              disabled={receiving}
              onChange={(v) => onDraft({ count: v as Num })}
              data-count
              classNames={{ input: receiving ? "stk__after" : undefined }}
            />
          </td>
          <td className="stk__num" data-label="Sold out at">
            <NumberInput
              {...box}
              aria-label={field("Sold out at")}
              value={soldOutAt}
              onChange={(v) => {
                const n = v as Num;
                // Low follows Sold out up, keeping its margin, until staff set it themselves.
                const low = draft?.lowAt ?? was?.lowAt ?? LOW_MARGIN;
                onDraft({ soldOutAt: n, ...(num(n) && num(low) && low < n ? { lowAt: n + LOW_MARGIN } : {}) });
              }}
            />
          </td>
          <td className="stk__num" data-label="Low at">
            <NumberInput {...box} aria-label={field("Low at")} value={draft?.lowAt ?? was?.lowAt ?? LOW_MARGIN} onChange={(v) => onDraft({ lowAt: v as Num })} />
          </td>
        </>
      ) : (
        <td className="stk__always" colSpan={4} data-label="Stock">
          Always orderable
        </td>
      )}
      <td className="stk__stateCol" data-label="Status">
        <span className={`stk__state stk__state--${st}`}>{starting && !level ? "Needs a count" : STATE_LABELS[st]}</span>
      </td>
      <td className="stk__more">
        <Tooltip label="History" openDelay={300}>
          <ActionIcon variant="subtle" size={44} onClick={() => historyOf(row)} aria-label={`History of ${row.product} ${name}`}>
            <Clock size={20} />
          </ActionIcon>
        </Tooltip>
      </td>
    </tr>
  );
});
