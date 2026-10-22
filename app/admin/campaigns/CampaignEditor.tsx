"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, Menu, NumberInput, Popover, Switch, TextInput } from "@mantine/core";
import {
  BLURB_MAX,
  MAX_RULES,
  NAME_MAX,
  PHASE_LABELS,
  RULE_HINTS,
  RULE_KINDS,
  RULE_NAMES,
  campaignProblems,
  campaignWarnings,
  campaignSkus,
  draftOf,
  endedBy,
  newRule,
  phaseOf,
  type Campaign,
  type CampaignDraft,
  type Phase,
  type Rule,
} from "@/lib/catalog/campaigns";
import { wholeOrNull } from "@/lib/catalog/edit";
import { rands } from "@/lib/catalog/listing";
import type { CampaignContext, StatusMove } from "@/lib/admin/campaigns";
import { fromShopLocal, toShopLocal } from "@/lib/shopTime";
import { Alert, ArrowLeft, Check, Plus } from "@/app/site/icons";
import { deleteCampaignAction, duplicateCampaignAction, moveCampaignAction, saveCampaignAction } from "../actions";
import { useLeaveGuard } from "../editor/useLeaveGuard";
import { at } from "../when";
import { Insights } from "./Insights";
import { dayOf, moment, summarise } from "./model";
import { contextNames } from "./names";
import { RuleCard } from "./RuleCard";


type Notice = { kind: "saved" | "error" | "conflict"; text: string } | null;

/** What each phase says under the title. */
function phaseNote(c: Campaign | null, phase: Phase, now: string): string {
  if (!c || phase === "draft") return "A draft: shoppers see nothing of it until it’s scheduled.";
  if (phase === "scheduled") return `Scheduled: it goes live on ${moment(c.startsAt!, now)}.`;
  if (phase === "live") return c.endsAt ? `Live in the shop until ${moment(c.endsAt, now)}.` : "Live in the shop until it’s ended.";
  if (phase === "paused") return "Paused: off the shop until it’s resumed.";
  const by = endedBy(c, Date.parse(now));
  return by === "cap" ? "Ended: it reached its limit." : by === "dates" ? `Ended on ${moment(c.endsAt!, now)}, as planned.` : `Ended early${c.endedAt ? `, ${moment(c.endedAt, now)}` : ""}.`;
}

/**
 * One campaign, end to end: its name, its deals written as sentences, when
 * it runs, its limits and how the storefront leads with it, beside what it
 * does in the shop, what it stacks with and the stock behind it. Changes wait
 * in the save bar; moving it along (schedule, pause, resume, end) saves first.
 */
export function CampaignEditor({ campaign, initial, ctx, others }: { campaign: Campaign | null; initial: CampaignDraft; ctx: CampaignContext; others: Campaign[] }) {
  const router = useRouter();
  // A fresh read after a conflict remounts the editor (the page keys it on the version), so these start from it.
  const [saved, setSaved] = useState<Campaign | null>(campaign);
  const [draft, setDraft] = useState<CampaignDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirming, setConfirming] = useState(false);

  const base = saved ? draftOf(saved) : initial;
  const changed = JSON.stringify(draft) !== JSON.stringify(base);
  // A new one is always unsaved; the guard asks only once something has been typed.
  const dirty = !saved || changed;
  useLeaveGuard(changed);

  const now = Date.parse(ctx.now);
  // Against the page's clock, so the server's render and the browser's agree.
  const phase: Phase = saved ? phaseOf(saved, now) : "draft";
  const problems = campaignProblems(draft, ctx.catalogue, now);
  // What could cost the shop money unmeant: asked about, never blocking.
  const warnings = campaignWarnings(draft, ctx.catalogue, contextNames(ctx));
  const switchedOn = phase === "live" || phase === "scheduled" || phase === "paused";

  const update = (patch: Partial<CampaignDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setNotice((n) => (n?.kind === "saved" ? null : n));
  };
  const setRule = (i: number, r: Rule) => update({ rules: draft.rules.map((x, j) => (j === i ? r : x)) });

  const save = useCallback(async (): Promise<Campaign | null> => {
    if (busy) return null;
    setBusy(true);
    const result = await saveCampaignAction(saved?.id ?? null, saved?.updatedAt ?? "", draft).catch(() => ({ error: "The save didn’t reach the server. Check your connection and try again." }));
    setBusy(false);
    if (!("ok" in result)) {
      setNotice({ kind: "conflict" in result && result.conflict ? "conflict" : "error", text: result.error });
      return null;
    }
    setSaved(result.campaign);
    setDraft(draftOf(result.campaign));
    setNotice({ kind: "saved", text: phaseOf(result.campaign, Date.now()) === "live" ? "Saved. The shop shows the change within five minutes." : "Saved." });
    if (!saved) router.replace(`/admin/campaigns/${result.campaign.id}`);
    return result.campaign;
  }, [busy, saved, draft, router]);

  const move = async (m: StatusMove) => {
    setConfirming(false);
    const c = dirty ? await save() : saved;
    if (!c) return;
    setBusy(true);
    const result = await moveCampaignAction(c.id, c.updatedAt, m).catch(() => ({ error: "That didn’t reach the server. Check your connection and try again." }));
    setBusy(false);
    if (!("ok" in result)) return setNotice({ kind: "conflict" in result && result.conflict ? "conflict" : "error", text: result.error });
    setSaved(result.campaign);
    const p = phaseOf(result.campaign, Date.now());
    setNotice({ kind: "saved", text: p === "live" ? "Live. The shop shows it within five minutes." : p === "scheduled" ? `Scheduled for ${moment(result.campaign.startsAt!, ctx.now)}.` : `${PHASE_LABELS[p]}.` });
  };

  // ⌘S / Ctrl+S saves, as everywhere in the console.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, save]);

  // Before it goes live: what in stock it would promise and can't, or soon can't.
  const sides = campaignSkus(draft.rules, ctx.catalogue);
  const stock = summarise(new Set([...sides.buy, ...sides.get]), ctx.stock);
  const short = stock.out.length + stock.low.length > 0;
  const ask = short || warnings.length > 0;
  const startsLater = draft.startsAt !== null && Date.parse(draft.startsAt) > now;
  const goLabel = startsLater ? "Schedule" : "Go live now";

  const used = saved?.used;

  return (
    <div className="editor camp">
      <div className="editor__top">
        <Link href="/admin/campaigns" className="back">
          <ArrowLeft size={18} />
          All campaigns
        </Link>
        {saved ? (
          <div className="editor__links">
            <button type="button" className="admin-link editor__view" disabled={busy} onClick={() => duplicateCampaignAction(saved.id).then((r) => r && setNotice({ kind: "error", text: r.error }))}>
              Duplicate
            </button>
            {saved.status === "draft" && saved.used.orders === 0 ? (
              <button
                type="button"
                className="admin-link editor__view"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Delete “${saved.name || "this draft"}”? It can’t be brought back.`)) {
                    void deleteCampaignAction(saved.id, saved.updatedAt).then((r) => r && setNotice({ kind: "error", text: r.error }));
                  }
                }}
              >
                Delete draft
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <header className="editor__head">
        <div className="editor__titles">
          <h1 className="page__title">{draft.name.trim() || "New campaign"}</h1>
          <p className="editor__meta">
            <span className={`cphase cphase--${phase}`}>{PHASE_LABELS[phase]}</span>
            <span>{phaseNote(saved, phase, ctx.now)}</span>
          </p>
        </div>

        <div className="camp__moves">
          {phase === "draft" ? (
            <Popover opened={confirming} onChange={setConfirming} position="bottom-end" withArrow shadow="md" trapFocus returnFocus>
              <Popover.Target>
                <Button disabled={problems.length > 0} loading={busy} onClick={() => (ask ? setConfirming((o) => !o) : void move("schedule"))}>
                  {goLabel}
                </Button>
              </Popover.Target>
              <Popover.Dropdown className="confirm">
                <p>{startsLater ? `Schedule it for ${moment(draft.startsAt!, ctx.now)}?` : "Put it live now?"}</p>
                {warnings.length ? (
                  <ul className="confirm__list">
                    {warnings.map((w) => (
                      <li key={w.message}>{w.message}</li>
                    ))}
                  </ul>
                ) : null}
                {short ? (
                  <p className="hint">
                    {stock.out.length ? `${stock.out.length} ${stock.out.length === 1 ? "size is" : "sizes are"} sold out and won’t show the deal. ` : ""}
                    {stock.low.length ? `${stock.low.length} ${stock.low.length === 1 ? "is" : "are"} low and may sell out while it runs.` : ""}
                  </p>
                ) : null}
                <div className="confirm__actions">
                  <Button variant="subtle" onClick={() => setConfirming(false)}>
                    Not yet
                  </Button>
                  <Button onClick={() => void move("schedule")}>{startsLater ? "Schedule anyway" : "Go live anyway"}</Button>
                </div>
              </Popover.Dropdown>
            </Popover>
          ) : null}
          {phase === "live" || phase === "scheduled" ? (
            <Button variant="light" loading={busy} onClick={() => void move("pause")}>
              Pause
            </Button>
          ) : null}
          {phase === "paused" ? (
            <Button loading={busy} onClick={() => void move("resume")}>
              Resume
            </Button>
          ) : null}
          {switchedOn ? (
            <Button variant="subtle" color="red" disabled={busy} onClick={() => window.confirm("End it now? It comes off the shop, and can only run again as a draft.") && void move("end")}>
              End now
            </Button>
          ) : null}
          {phase === "ended" && saved?.status === "ended" ? (
            <Button variant="light" loading={busy} onClick={() => void move("reopen")}>
              Back to a draft
            </Button>
          ) : null}
        </div>
      </header>

      {warnings.length ? (
        <div className="checklist camp__warn" role="region" aria-label="Check before it goes live">
          <p className="checklist__title">
            <Alert size={18} /> Check {phase === "draft" ? "before it goes live" : "this is meant"}:
          </p>
          <ul>
            {warnings.map((w) => (
              <li key={w.message}>{w.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {phase === "draft" && problems.length ? (
        <div className="checklist" role="region" aria-label="Before it can go live">
          <p className="checklist__title">Before it can go live:</p>
          <ul>
            {problems.map((p) => (
              <li key={p.message}>
                {p.rule ? (
                  <button type="button" className="admin-link" onClick={() => document.getElementById(`rule-${p.rule}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                    {p.message}
                  </button>
                ) : (
                  p.message
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {used && phase !== "draft" ? (
        <dl className="camp__results" aria-label="Results, from paid orders">
          <div>
            <dt>Orders</dt>
            <dd className="mono">{used.orders}</dd>
          </div>
          <div>
            <dt>Units on deal</dt>
            <dd className="mono">{used.units}</dd>
          </div>
          <div>
            <dt>Sales</dt>
            <dd className="mono">{rands(used.sales)}</dd>
          </div>
          <div>
            <dt>Given away</dt>
            <dd className="mono">{rands(used.discount)}</dd>
          </div>
          <p className="hint camp__resultsNote">From paid orders, before any refund.</p>
        </dl>
      ) : null}

      <div className="editor__body">
        <div className="editor__main">
          <div className="panel camp__panel">
            <section className="group" aria-labelledby="c-name">
              <h2 id="c-name" className="group__title">
                Name
              </h2>
              <TextInput
                aria-labelledby="c-name"
                description="For staff, and on the storefront’s band when it’s featured."
                placeholder="Christmas 2026"
                value={draft.name}
                maxLength={NAME_MAX}
                onChange={(e) => update({ name: e.currentTarget.value })}
                className="field--narrow"
              />
            </section>

            <section className="group" aria-labelledby="c-deals">
              <div className="group__head">
                <h2 id="c-deals" className="group__title">
                  Deals
                </h2>
                <p className="hint">Every deal here and in other live campaigns stacks: price deals first, then item deals, then spend thresholds on what’s left.</p>
              </div>
              {draft.rules.length === 0 ? <p className="hint">No deal yet. Add one: it’s what shoppers get.</p> : null}
              {draft.rules.map((r, i) => (
                <RuleCard
                  key={r.id}
                  rule={r}
                  index={i}
                  total={draft.rules.length}
                  ctx={ctx}
                  onChange={(next) => setRule(i, next)}
                  onRemove={() => update({ rules: draft.rules.filter((_, j) => j !== i) })}
                  problems={[...problems, ...warnings].filter((p) => p.rule === r.id).map((p) => p.message.replace(/^Deal \d+: /, ""))}
                />
              ))}
              {draft.rules.length < MAX_RULES ? (
                <Menu position="bottom-start" shadow="md" withArrow>
                  <Menu.Target>
                    <Button variant="light" leftSection={<Plus size={18} />} className="camp__add">
                      {draft.rules.length ? "Add another deal" : "Add a deal"}
                    </Button>
                  </Menu.Target>
                  <Menu.Dropdown className="camp__kinds">
                    {RULE_KINDS.map((k) => (
                      <Menu.Item key={k} onClick={() => update({ rules: [...draft.rules, newRule(k)] })}>
                        <span className="camp__kind">{RULE_NAMES[k]}</span>
                        <span className="camp__kindHint">{RULE_HINTS[k]}</span>
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              ) : null}
            </section>

            <section className="group" aria-labelledby="c-when">
              <div className="group__head">
                <h2 id="c-when" className="group__title">
                  When
                </h2>
                <p className="hint">In the shop’s time. With no start, it goes live the moment it’s switched on; with no end, it runs until it’s ended.</p>
              </div>
              <div className="row">
                <TextInput
                  type="datetime-local"
                  label="Starts"
                  value={toShopLocal(draft.startsAt)}
                  onChange={(e) => update({ startsAt: fromShopLocal(e.currentTarget.value) })}
                  disabled={phase === "live" || phase === "ended"}
                  description={phase === "live" ? "It’s live: pause or end it instead." : undefined}
                />
                <TextInput type="datetime-local" label="Ends" value={toShopLocal(draft.endsAt)} onChange={(e) => update({ endsAt: fromShopLocal(e.currentTarget.value) })} disabled={phase === "ended"} />
              </div>
              {ctx.seasons.length && phase !== "ended" ? (
                <div className="camp__seasons">
                  <p className="hint">End as a gifting day begins:</p>
                  <div className="chips">
                    {ctx.seasons.map((s) => (
                      <button key={s.value} type="button" className="camp__season" aria-pressed={draft.endsAt === s.at} onClick={() => update({ endsAt: s.at })}>
                        {s.label} <span className="mono">{dayOf(s.at)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="group" aria-labelledby="c-limits">
              <div className="group__head">
                <h2 id="c-limits" className="group__title">
                  Limits
                </h2>
                <p className="hint">Counted from paid orders. It ends on its own when a limit is reached; the order that reaches it keeps its deal.</p>
              </div>
              <div className="row">
                <NumberInput
                  label="Most orders"
                  description="Blank: no limit."
                  value={draft.caps.orders ?? ""}
                  onChange={(v) => update({ caps: { ...draft.caps, orders: wholeOrNull(v) } })}
                  min={1}
                  allowDecimal={false}
                  className="camp__cap"
                />
                <NumberInput
                  label="Most units on deal"
                  description="Blank: no limit."
                  value={draft.caps.units ?? ""}
                  onChange={(v) => update({ caps: { ...draft.caps, units: wholeOrNull(v) } })}
                  min={1}
                  allowDecimal={false}
                  className="camp__cap"
                />
              </div>
              <Switch
                size="md"
                label="Once per customer"
                description="By email address. A customer who has had it is told so at checkout, with the new total."
                checked={draft.caps.perCustomer}
                onChange={(e) => update({ caps: { ...draft.caps, perCustomer: e.currentTarget.checked } })}
              />
            </section>

            <section className="group" aria-labelledby="c-shop">
              <div className="group__head">
                <h2 id="c-shop" className="group__title">
                  On the shop
                </h2>
                <p className="hint">
                  <span className="where__lead">In the shop:</span> while it’s live, what it covers is on the Specials shelf, with the deal on its photo, its product page and in the cart.
                </p>
              </div>
              <Switch
                size="md"
                label="Feature on the storefront"
                description="The specials band on the shop’s front page takes its name and line. The newest featured campaign leads."
                checked={draft.featured}
                onChange={(e) => update({ featured: e.currentTarget.checked })}
              />
              {draft.featured ? (
                <TextInput
                  label="The band’s line"
                  placeholder="Half price prints with every frame, until Christmas Eve."
                  value={draft.blurb}
                  maxLength={BLURB_MAX}
                  onChange={(e) => update({ blurb: e.currentTarget.value })}
                  description={`${draft.blurb.length} of ${BLURB_MAX}`}
                />
              ) : null}
            </section>

            {saved?.log?.length ? (
              <section className="group" aria-labelledby="c-log">
                <h2 id="c-log" className="group__title">
                  History
                </h2>
                <ol className="olog camp__log">
                  {[...saved.log].reverse().slice(0, 10).map((l) => (
                    <li key={`${l.at}${l.text}`}>
                      <span>{l.text}</span> <span className="hint">{l.by}, {at(l.at)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </div>

        <Insights id={saved?.id ?? "new"} draft={draft} sides={sides} ctx={ctx} others={others} />
      </div>

      <CampaignSaveBar dirty={dirty} busy={busy} notice={notice} live={switchedOn} onSave={() => void save()} onDiscard={() => setDraft(base)} onReload={() => router.refresh()} isNew={!saved} />
    </div>
  );
}

/** The one place a save happens: unsaved changes in amber, then whether it saved and what that did to the shop. */
function CampaignSaveBar({ dirty, busy, notice, live, isNew, onSave, onDiscard, onReload }: { dirty: boolean; busy: boolean; notice: Notice; live: boolean; isNew: boolean; onSave: () => void; onDiscard: () => void; onReload: () => void }) {
  if (notice?.kind === "conflict") {
    return (
      <div className="savebar savebar--alert" role="alert">
        <p className="savebar__text">
          <Alert size={20} />
          <span>{notice.text} Loading the latest version drops your changes here.</span>
        </p>
        <div className="savebar__actions">
          <Button onClick={onReload}>Load the latest version</Button>
        </div>
      </div>
    );
  }
  if (!dirty && notice?.kind === "saved") {
    return (
      <div className="savebar savebar--done" role="status">
        <p className="savebar__text">
          <Check size={20} />
          <span>{notice.text}</span>
        </p>
      </div>
    );
  }
  if (!dirty) return null;
  return (
    <div className="savebar savebar--dirty" role="region" aria-label="Unsaved changes">
      <div className="savebar__text">
        {notice?.kind === "error" ? (
          <p role="alert" className="savebar__problems">
            <Alert size={20} />
            <span>Not saved. {notice.text}</span>
          </p>
        ) : (
          <>
            <p>
              <span className="savebar__mark" aria-hidden="true" />
              {isNew ? "Not saved yet. Saving keeps it as a draft." : "Unsaved changes"}
            </p>
            {live ? <p className="savebar__reach">It’s switched on, so shoppers see these changes as soon as you save.</p> : null}
          </>
        )}
      </div>
      <div className="savebar__actions">
        {isNew ? null : (
          <Button variant="subtle" onClick={onDiscard} disabled={busy}>
            Discard
          </Button>
        )}
        <Button onClick={onSave} loading={busy} className="savebar__save">
          {isNew ? "Save draft" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
