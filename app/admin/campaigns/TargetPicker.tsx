"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Chip, CloseButton, MultiSelect, SegmentedControl } from "@mantine/core";
import { targetSkus, type Target, type TargetKind } from "@/lib/catalog/campaigns";
import { STATE_LABELS } from "@/lib/catalog/stock";
import type { CampaignContext } from "@/lib/admin/campaigns";
import { ProductImage } from "@/app/site/ProductImage";
import { Alert } from "@/app/site/icons";
import { skuIndex, stockLine, stockOf, summarise } from "./model";

const KINDS: { value: TargetKind; label: string }[] = [
  { value: "products", label: "Products" },
  { value: "categories", label: "Categories" },
  { value: "tags", label: "Tags" },
  { value: "all", label: "Everything" },
];

const empty = (kind: TargetKind): Target =>
  kind === "all" ? { kind } : kind === "categories" ? { kind, ids: [] } : kind === "tags" ? { kind, tags: [] } : { kind, items: [] };

/**
 * What one side of a deal covers: chosen products (every size, or some),
 * whole categories, products carrying a tag, or everything in the shop. Every
 * size shows its stock as it is now, and the line under the picker counts
 * what is sold out or low, so a deal is never aimed at an empty shelf
 * unawares. `side` names it in the warnings: what is bought, or what is given.
 */
export function TargetPicker({
  id,
  label,
  value,
  onChange,
  ctx,
  side = "buy",
  allowAll = true,
}: {
  id: string;
  label: string;
  value: Target;
  onChange: (t: Target) => void;
  ctx: CampaignContext;
  side?: "buy" | "get";
  allowAll?: boolean;
}) {
  const index = useMemo(() => skuIndex(ctx.catalogue), [ctx.catalogue]);
  const bySlug = useMemo(() => new Map(ctx.catalogue.map((p) => [p.slug, p])), [ctx.catalogue]);
  const productData = useMemo(() => ctx.catalogue.map((p) => ({ value: p.slug, label: `${p.name} · ${p.code}` })), [ctx.catalogue]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of ctx.catalogue) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    return m;
  }, [ctx.catalogue]);

  const skus = targetSkus(value, ctx.catalogue);
  const summary = summarise(skus, ctx.stock);
  const flagged = [...summary.out, ...summary.low];

  return (
    <fieldset className="tpick" id={id}>
      <legend className="tpick__legend">{label}</legend>
      <SegmentedControl
        aria-label={`${label}: what it covers`}
        value={value.kind}
        onChange={(k) => k !== value.kind && onChange(empty(k as TargetKind))}
        data={allowAll ? KINDS : KINDS.filter((k) => k.value !== "all")}
      />

      {value.kind === "products" ? (
        <>
          <MultiSelect
            aria-label={`${label}: products`}
            placeholder={value.items.length ? "Add another" : "Search by name or code"}
            searchable
            data={productData}
            value={value.items.map((i) => i.slug)}
            onChange={(slugs) => onChange({ kind: "products", items: slugs.map((slug) => value.items.find((i) => i.slug === slug) ?? { slug, skus: null }) })}
            nothingFoundMessage="No product in the shop by that name or code"
            limit={40}
            hidePickedOptions
            clearable={false}
            // The chosen ones are listed below with their sizes, so the field holds only the search.
            classNames={{ pill: "tpick__hiddenPill" }}
          />
          {value.items.length ? (
            <ul className="tpick__items">
              {value.items.map((item) => {
                const p = bySlug.get(item.slug);
                if (!p) return null;
                const priced = p.variants.filter((v) => v.price !== null);
                const chosen = item.skus ?? priced.map((v) => v.sku);
                const setSizes = (next: string[]) =>
                  onChange({ kind: "products", items: value.items.map((i) => (i.slug === item.slug ? { ...i, skus: next.length === priced.length ? null : next } : i)) });
                return (
                  <li key={item.slug} className="tpick__item">
                    <span className="tpick__thumb" aria-hidden="true">
                      {p.photo ? <ProductImage code={p.photo} alt="" fill sizes="44px" /> : null}
                    </span>
                    <div className="tpick__what">
                      <p className="tpick__name">
                        {p.name} <span className="mono tpick__code">{p.code}</span>
                      </p>
                      {priced.length > 1 ? (
                        <Chip.Group multiple value={chosen} onChange={setSizes}>
                          <div className="tpick__sizes" role="group" aria-label={`${p.name}: sizes in the deal`}>
                            {priced.map((v) => {
                              const s = stockOf(ctx.stock, v.sku);
                              return (
                                <Chip key={v.sku} value={v.sku} size="md" className={`tpick__size tpick__size--${s.state}`}>
                                  {v.title}
                                  {s.state === "out" ? " · Sold out" : s.state === "low" ? ` · ${s.onHand} left` : ""}
                                </Chip>
                              );
                            })}
                          </div>
                        </Chip.Group>
                      ) : priced[0] ? (
                        <SizeStock state={stockOf(ctx.stock, priced[0].sku)} />
                      ) : (
                        <p className="hint">No price yet, so no deal can reach it.</p>
                      )}
                    </div>
                    <CloseButton
                      aria-label={`Take ${p.name} out of the deal`}
                      onClick={() => onChange({ kind: "products", items: value.items.filter((i) => i.slug !== item.slug) })}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : value.kind === "categories" ? (
        <Chip.Group multiple value={value.ids} onChange={(ids) => onChange({ kind: "categories", ids })}>
          <div className="chips" role="group" aria-label={`${label}: categories`}>
            {ctx.categories.map((c) => (
              <Chip key={c.id} value={c.id} size="md">
                {c.name} <span className="tpick__count">{counts.get(c.id) ?? 0}</span>
              </Chip>
            ))}
          </div>
        </Chip.Group>
      ) : value.kind === "tags" ? (
        <MultiSelect
          aria-label={`${label}: tags`}
          placeholder={value.tags.length ? "Add another" : "Mugs, Mother’s Day, For kids…"}
          searchable
          data={ctx.tags}
          value={value.tags}
          onChange={(tags) => onChange({ kind: "tags", tags })}
          nothingFoundMessage="No tag by that name"
        />
      ) : (
        <p className="hint">Every product in the shop, as it is and as more are added.</p>
      )}

      {skus.length > 0 ? (
        <div className={`tpick__sum${flagged.length ? " tpick__sum--warn" : ""}`}>
          <p>
            {flagged.length ? <Alert size={18} /> : null}
            <span>
              {stockLine(summary)}
              {summary.out.length && side === "get" ? ". A sold-out size can’t be given, so the shop won’t offer it." : ""}
              {summary.out.length && side === "buy" ? ". Sold-out sizes don’t show the deal." : ""}
            </span>
          </p>
          {flagged.length && value.kind !== "products" ? (
            <details className="tpick__which">
              <summary>See which</summary>
              <ul>
                {flagged.map((sku) => {
                  const info = index.get(sku);
                  const s = stockOf(ctx.stock, sku);
                  return (
                    <li key={sku}>
                      <Link className="admin-link" href={`/admin/stock?q=${encodeURIComponent(sku)}`} target="_blank">
                        {info?.what ?? sku}
                      </Link>{" "}
                      <SizeStock state={s} inline />
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

/** A size's stock in words beside its state's mark: "Low · 2 left", "Sold out", "Not tracked". */
export function SizeStock({ state: s, inline = false }: { state: ReturnType<typeof stockOf>; inline?: boolean }) {
  const words = s.state === "low" ? `Low · ${s.onHand} left` : s.state === "in" ? `In stock · ${s.onHand}` : STATE_LABELS[s.state];
  const Tag = inline ? "span" : "p";
  return <Tag className={`stk__state stk__state--${s.state} tpick__stock`}>{words}</Tag>;
}
