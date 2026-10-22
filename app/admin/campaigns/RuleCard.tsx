"use client";

import { ActionIcon, NumberInput, Select, TextInput, Tooltip } from "@mantine/core";
import {
  LABEL_MAX,
  OFFS_FOR,
  RULE_NAMES,
  dealLabel,
  resolveRule,
  type Off,
  type OffKind,
  type Rule,
} from "@/lib/catalog/campaigns";
import { toCents, toRands, wholeOrNull } from "@/lib/catalog/edit";
import type { CampaignContext } from "@/lib/admin/campaigns";
import { contextNames } from "./names";
import { Trash } from "@/app/site/icons";
import { TargetPicker } from "./TargetPicker";

const OFF_LABELS: Record<OffKind, string> = { free: "free", percent: "% off", amount: "rand off each", price: "sold for" };
const SPEND_OFF_LABELS: Partial<Record<OffKind, string>> = { amount: "rand off the order", percent: "% off what counts" };


/** How much off: free, a percentage, rand off each, or a price each is sold for. */
function OffControl({ off, kinds, onChange, labels = OFF_LABELS, label }: { off: Off; kinds: OffKind[]; onChange: (o: Off) => void; labels?: Partial<Record<OffKind, string>>; label: string }) {
  const value = off.kind === "free" ? null : off.value;
  return (
    <span className="sentence__off">
      {off.kind === "free" ? null : off.kind === "percent" ? (
        <NumberInput aria-label={`${label}: per cent`} className="sentence__num" value={value ?? ""} onChange={(v) => onChange({ kind: "percent", value: wholeOrNull(v) })} min={1} max={100} suffix="%" allowDecimal={false} hideControls />
      ) : (
        <NumberInput
          aria-label={`${label}: rand`}
          className="sentence__num sentence__num--money"
          value={toRands(value)}
          onChange={(v) => onChange({ kind: off.kind as "amount" | "price", value: toCents(v) })}
          min={0}
          prefix="R"
          decimalScale={2}
          thousandSeparator=" "
          hideControls
        />
      )}
      <Select
        aria-label={`${label}: how`}
        className="sentence__select"
        data={kinds.map((k) => ({ value: k, label: labels[k] ?? OFF_LABELS[k] }))}
        value={off.kind}
        allowDeselect={false}
        onChange={(k) => {
          if (!k || k === off.kind) return;
          const kind = k as OffKind;
          // The number carries across between percent and rand only where it still means something.
          onChange(kind === "free" ? { kind } : { kind, value: off.kind === "free" || (off.kind === "percent") !== (kind === "percent") ? null : off.value });
        }}
        comboboxProps={{ withinPortal: true }}
      />
    </span>
  );
}

function Count({ value, onChange, label, max = 99 }: { value: number | null; onChange: (n: number | null) => void; label: string; max?: number }) {
  return <NumberInput aria-label={label} className="sentence__num sentence__num--count" value={value ?? ""} onChange={(v) => onChange(wholeOrNull(v))} min={1} max={max} allowDecimal={false} hideControls />;
}

/**
 * One deal of a campaign, written as the sentence it is: the words are the
 * page's own and the blanks are controls, so the rule reads back exactly as
 * the shop means it. Under the sentence, what it covers; then the words
 * shoppers will see, generated until staff write their own.
 */
export function RuleCard({
  rule,
  index,
  total,
  onChange,
  onRemove,
  ctx,
  problems,
}: {
  rule: Rule;
  index: number;
  total: number;
  onChange: (r: Rule) => void;
  onRemove: () => void;
  ctx: CampaignContext;
  problems: string[];
}) {
  const set = (patch: Partial<Rule>) => onChange({ ...rule, ...patch } as Rule);
  const id = `rule-${rule.id}`;
  const name = total > 1 ? `Deal ${index + 1}` : "The deal";
  // The words the shop will show, from the rule as it stands.
  const live = resolveRule({ ...rule, label: "" }, ctx.catalogue, contextNames(ctx));
  const generated = live ? dealLabel(live, rule.kind === "pair" ? "get" : "buy") : "";

  return (
    <section className="rule" id={id} aria-labelledby={`${id}-title`}>
      <header className="rule__head">
        <h3 id={`${id}-title`} className="rule__title">
          {name} <span className="rule__kind">{RULE_NAMES[rule.kind]}</span>
        </h3>
        <Tooltip label={`Remove ${name.toLowerCase()} from this campaign`}>
          <ActionIcon variant="subtle" size="lg" aria-label={`Remove ${name.toLowerCase()}`} onClick={onRemove}>
            <Trash size={20} />
          </ActionIcon>
        </Tooltip>
      </header>

      <p className="sentence">
        {rule.kind === "price" ? (
          <>
            <span>The products below are</span>
            <OffControl off={rule.off} kinds={OFFS_FOR.price} onChange={(off) => set({ off })} label={name} />
            <span>until the campaign ends.</span>
          </>
        ) : rule.kind === "bxgy" ? (
          <>
            <span>Buy</span>
            <Count value={rule.buy} onChange={(buy) => set({ buy: buy ?? 1 })} label={`${name}: how many they buy`} />
            <span>and get</span>
            <Count value={rule.get} onChange={(get) => set({ get: get ?? 1 })} label={`${name}: how many they get`} />
            <span>more</span>
            <OffControl off={rule.off} kinds={OFFS_FOR.bxgy} onChange={(off) => set({ off })} label={name} />
            <span>. The cheapest are the ones reduced.</span>
          </>
        ) : rule.kind === "pair" ? (
          <>
            <span>For each one bought, up to</span>
            <Count value={rule.per} onChange={(per) => set({ per: per ?? 1 })} label={`${name}: how many are reduced for each one bought`} />
            <span>of what’s reduced {rule.per === 1 ? "is" : "are"}</span>
            <OffControl off={rule.off} kinds={OFFS_FOR.pair} onChange={(off) => set({ off })} label={name} />
          </>
        ) : (
          <>
            <span>Spend</span>
            <NumberInput
              aria-label={`${name}: how much they spend`}
              className="sentence__num sentence__num--money"
              value={toRands(rule.min)}
              onChange={(v) => set({ min: toCents(v) })}
              min={0}
              prefix="R"
              decimalScale={2}
              thousandSeparator=" "
              hideControls
            />
            <span>or more, after the other deals, and get</span>
            <OffControl off={rule.off} kinds={OFFS_FOR.spend} labels={SPEND_OFF_LABELS} onChange={(off) => set({ off })} label={name} />
          </>
        )}
      </p>

      {rule.kind === "pair" ? (
        <div className="rule__sides">
          <TargetPicker id={`${id}-buy`} label="What they buy" value={rule.buy} onChange={(buy) => set({ buy })} ctx={ctx} allowAll={false} />
          <TargetPicker id={`${id}-get`} label="What’s reduced" value={rule.get} onChange={(get) => set({ get })} ctx={ctx} side="get" allowAll={false} />
        </div>
      ) : (
        <TargetPicker
          id={`${id}-target`}
          label={rule.kind === "spend" ? "What counts toward the spend" : rule.kind === "bxgy" ? "What they buy, and get" : "Which products"}
          value={rule.target}
          onChange={(target) => set({ target })}
          ctx={ctx}
          side={rule.kind === "bxgy" ? "get" : "buy"}
        />
      )}

      <div className="rule__extra">
        {rule.kind === "bxgy" || rule.kind === "pair" ? (
          <NumberInput
            label="Most times an order"
            description="Blank: as often as the cart allows."
            className="rule__limit"
            value={rule.limit ?? ""}
            onChange={(v) => set({ limit: wholeOrNull(v) })}
            min={1}
            max={99}
            allowDecimal={false}
          />
        ) : null}
        <TextInput
          label="Words on the shop"
          description="On its photo, the product page and the cart. Leave blank for the words shown."
          className="rule__label"
          placeholder={generated || "Set the deal first"}
          value={rule.label}
          maxLength={LABEL_MAX}
          onChange={(e) => set({ label: e.currentTarget.value })}
        />
      </div>

      {problems.length ? (
        <ul className="rule__problems" aria-label={`${name}: still to do`}>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
