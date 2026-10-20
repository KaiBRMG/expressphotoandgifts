"use client";

import "@/app/shop/shop.css";

import { useMemo, useState } from "react";
import { priceRange, type ProductDraft, type TabId } from "@/lib/catalog/edit";
import { slotLabels } from "@/lib/catalog/checkout";
import { photoCode, priceLabel, primaryPhoto, rands, toListings } from "@/lib/catalog/listing";
import { photoSpec } from "@/lib/catalog/photos";
import { takesLine } from "@/lib/catalog/purchase";
import { cmLabel } from "@/lib/catalog/sizes";
import { termLabel, tagValues, type PhotoShape, type Vocabulary } from "@/lib/catalog/tags";
import type { Product } from "@/lib/catalog/types";
import { ProductCard } from "@/app/shop/ProductCard";
import { ProductImage } from "@/app/site/ProductImage";
import { ArrowRight, YourPhoto } from "@/app/site/icons";
import { goesWithRow } from "./GoesWith";
import type { CatalogueItem } from "./ProductEditor";

/** Opens a tab and puts the cursor on one of its controls. */
export type Go = (tab: TabId, field: string) => void;

const TITLES: Record<TabId, string> = {
  shelf: "On its shelf",
  photos: "Its photos in the shop",
  page: "Its product page",
  prices: "Its product page",
  checkout: "At checkout",
};

/**
 * The part of the shop the open tab changes, drawn from the draft as it is
 * typed: its card on its shelf, its gallery, its product page, or its photo
 * step at checkout. The card is the shop's own component, so it cannot drift
 * from the real thing; the rest is the same content laid out as the shop
 * lays it out. Whether shoppers can see it at all is said once, under the status.
 */
export function Preview({
  draft,
  slug,
  category,
  tab,
  vocabulary,
  catalogue,
  onGo,
}: {
  draft: ProductDraft;
  slug: string;
  category: string;
  tab: TabId;
  vocabulary: Vocabulary;
  catalogue: CatalogueItem[];
  onGo: Go;
}) {
  const listing = useMemo(() => {
    const product = { ...draft, slug, currency: "ZAR", priceRange: priceRange(draft.variants), createdAt: "", updatedAt: "" } as Product;
    return toListings([product], new Map([[draft.categoryId, category]]))[0];
  }, [draft, slug, category]);

  const card = (
    <div className="preview__card" inert>
      <ProductCard listing={listing} sizes="280px" />
    </div>
  );

  return (
    <aside className="preview" aria-label="Preview">
      <h2 className="preview__title">{TITLES[tab]}</h2>
      {tab === "shelf" ? <Shelf draft={draft} category={category} card={card} vocab={vocabulary} /> : null}
      {tab === "photos" ? <Photos draft={draft} card={card} /> : null}
      {tab === "page" || tab === "prices" ? <Page draft={draft} tab={tab} onGo={onGo} goes={goesWithRow(draft, catalogue).map((p) => p.name)} /> : null}
      {tab === "checkout" ? <Checkout draft={draft} /> : null}
    </aside>
  );
}

/** The shelf's name, its row of type buttons with this one pressed, the card, and the filters that find it. */
function Shelf({ draft, category, card, vocab }: { draft: ProductDraft; category: string; card: React.ReactNode; vocab: Vocabulary }) {
  const types = vocab.type.filter((t) => t.category === draft.categoryId);
  const [type] = tagValues(draft.tags, "type");
  const found = [
    { name: "Occasion", values: tagValues(draft.tags, "occasion").map((v) => termLabel(vocab, "occasion", v)) },
    { name: "Who it’s for", values: tagValues(draft.tags, "for").map((v) => termLabel(vocab, "for", v)) },
  ].filter((f) => f.values.length);

  return (
    <div className="pv">
      <p className="pv__shelf">{category || "No shelf yet"}</p>
      {types.length ? (
        <div className="kinds pv__kinds" inert>
          <ul>
            {types.map((t) => (
              <li key={t.value}>
                <button type="button" aria-pressed={t.value === type}>
                  <span>{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!type ? <p className="pv__missing">Not under any type yet, so it can’t show.</p> : null}
      {card}
      {found.length ? (
        <dl className="pv__found">
          {found.map((f) => (
            <div key={f.name}>
              <dt>{f.name}</dt>
              <dd>{f.values.join(", ")}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {draft.special ? <p className="pv__note">Also on the Specials shelf.</p> : null}
    </div>
  );
}

/** The card, then every image in the shop's order: product photos for the gallery, diagrams for "Details and care". */
function Photos({ draft, card }: { draft: ProductDraft; card: React.ReactNode }) {
  const photos = draft.media.filter((m) => m.role === "photo");
  const diagrams = draft.media.filter((m) => m.role === "dimension");
  return (
    <div className="pv">
      {card}
      <p className="pv__label">Gallery on its page</p>
      {photos.length ? (
        <ol className="pv__thumbs">
          {photos.map((m, i) => (
            <li key={m.publicId} className={i === 0 ? "pv__thumb pv__thumb--main" : "pv__thumb"}>
              <ProductImage code={photoCode(m.publicId)} alt="" width={400} height={400} sizes="88px" />
            </li>
          ))}
        </ol>
      ) : (
        <p className="pv__missing">“Photo to come” until a product photo is added.</p>
      )}
      {diagrams.length ? (
        <>
          <p className="pv__label">In “Details and care”</p>
          <div className="pv__thumbs">
            <span className="pv__thumb">
              <ProductImage code={photoCode(diagrams[0].publicId)} alt="" width={400} height={400} sizes="88px" />
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

type Part = { id: string; label: string; tab: TabId; field: string; body: React.ReactNode };

/**
 * The product page from top to bottom, one row per part, with the parts the
 * open tab changes in full ink and the rest faint. Each row opens the
 * control that changes it, so the page itself is a way round the editor.
 */
function Page({ draft, tab, onGo, goes }: { draft: ProductDraft; tab: TabId; onGo: Go; goes: string[] }) {
  const main = primaryPhoto(draft);
  const first = draft.variants[0];
  const takes = first ? takesLine(draft, first) : null;

  const parts: Part[] = [
    {
      id: "photo",
      label: "Photos",
      tab: "photos",
      field: "photos-add",
      body: main ? (
        <span className="pv__photo">
          <ProductImage code={main} alt="" width={400} height={400} sizes="64px" />
        </span>
      ) : (
        <span className="pv__faint">Photo to come</span>
      ),
    },
    { id: "name", label: "Name", tab: "page", field: "field-name", body: <strong>{draft.name.trim() || "No name yet"}</strong> },
    {
      id: "price",
      label: "Price",
      tab: "prices",
      field: "prices-grid",
      body: <span className="mono">{first?.price != null ? rands(first.price) : priceLabel({ min: null, max: null })}</span>,
    },
    {
      id: "description",
      label: "Description",
      tab: "page",
      field: "field-description",
      body: draft.description.trim() ? <span className="pv__clamp">{draft.description}</span> : <span className="pv__faint">None yet</span>,
    },
    ...(takes
      ? [{ id: "takes", label: "What it takes", tab: "checkout" as const, field: "customer-sends", body: <span className="pv__takes"><YourPhoto size={18} />{takes}</span> }]
      : []),
    ...(draft.options.length
      ? [
          {
            id: "options",
            label: "Options",
            tab: "prices" as const,
            field: "prices-options",
            body: (
              <span className="pv__options">
                {draft.options.map((o) => (
                  <span key={o.name}>
                    {o.name || "Unnamed"}: {o.values.slice(0, 3).join(", ")}
                    {o.values.length > 3 ? ` +${o.values.length - 3}` : ""}
                  </span>
                ))}
              </span>
            ),
          },
        ]
      : []),
    {
      id: "care",
      label: "Details and care",
      tab: "page",
      field: "field-specs",
      body:
        draft.specifications.length || draft.careNotes ? (
          <span className="pv__options">
            {draft.specifications.slice(0, 3).map((s, i) => (
              <span key={i}>{s}</span>
            ))}
            {draft.specifications.length > 3 ? <span>+{draft.specifications.length - 3} more</span> : null}
            {draft.careNotes ? <span>Care: {draft.careNotes}</span> : null}
          </span>
        ) : (
          <span className="pv__faint">Not shown: nothing to list</span>
        ),
    },
    {
      id: "goes",
      label: "Goes with this",
      tab: "page",
      field: "field-goes",
      body: goes.length ? (
        <span className="pv__options">
          {goes.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </span>
      ) : (
        <span className="pv__faint">Not shown: nothing goes with it yet</span>
      ),
    },
  ];

  return (
    <ol className="pv__page">
      {parts.map((p) => {
        const here = p.tab === tab;
        return (
          <li key={p.id}>
            <button
              type="button"
              className={here ? "pv__part pv__part--here" : "pv__part"}
              onClick={() => onGo(p.tab, p.field)}
            >
              <span className="pv__label">{p.label}</span>
              <span className="pv__body">{p.body}</span>
              <ArrowRight size={16} className="pv__go" />
              <span className="visually-hidden">, change it</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const SHAPE_CLASS: Record<PhotoShape, string> = { rect: "", round: " pv__slot--round", dome: " pv__slot--dome" };
const MAX_SLOTS = 8;

/** The photo step for one of its choices: the places a customer fills, drawn at the print's proportions and outline. */
function Checkout({ draft }: { draft: ProductDraft }) {
  const [sku, setSku] = useState<string | null>(null);
  const p = draft.personalisation;
  if (!p) return <p className="pv__missing">Takes no photo, so checkout skips the photo step for it.</p>;

  // Where the photos differ by choice, one variant per count shows each layout.
  const seen = new Set<number | undefined>();
  const layouts =
    tagValues(draft.tags, "photos").length > 1
      ? draft.variants.filter((v) => {
          const n = photoSpec(draft, v)?.photos;
          return !seen.has(n) && Boolean(seen.add(n));
        })
      : [];
  const variant = draft.variants.find((v) => v.sku === sku) ?? draft.variants[0];
  const spec = variant ? photoSpec(draft, variant) : null;
  if (!variant || !spec) return <p className="pv__missing">Say how many photos it takes to see its photo step.</p>;

  const labels = slotLabels(spec.photos, p.kind);
  const ratio = spec.shape !== "round" && spec.print ? `${spec.print.w} / ${spec.print.h}` : "1";

  return (
    <div className="pv">
      <p className="pv__takes">
        <YourPhoto size={18} />
        {takesLine(draft, variant)}
      </p>
      {layouts.length > 1 ? (
        <div className="pv__layouts" role="group" aria-label="Show the photo step for">
          {layouts.map((v) => (
            <button key={v.sku} type="button" aria-pressed={v.sku === variant.sku} onClick={() => setSku(v.sku)}>
              {v.title}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="pv__slots">
        {labels.slice(0, MAX_SLOTS).map((label) => (
          <li key={label}>
            <span className={`pv__slot${SHAPE_CLASS[spec.shape]}`} style={{ aspectRatio: ratio }}>
              Add photo
            </span>
            <span className="pv__slotName">{label}</span>
            {spec.print ? <span className="pv__slotSize mono">{cmLabel(spec.print)}</span> : null}
          </li>
        ))}
      </ul>
      {labels.length > MAX_SLOTS ? <p className="pv__note">and {labels.length - MAX_SLOTS} more places like these</p> : null}
      {p.text ? <p className="pv__words">Your words (optional)</p> : null}
    </div>
  );
}
