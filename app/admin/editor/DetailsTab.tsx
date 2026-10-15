"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Modal, Select, Textarea, TextInput } from "@mantine/core";
import { normaliseCode, recodeVariants, SLUG_PATTERN, slugify, type ProductDraft } from "@/lib/catalog/edit";
import { findTerm, tagValues } from "@/lib/catalog/tags";
import type { Category } from "@/lib/catalog/types";
import { ArrowDown, ArrowUp, Plus, Trash } from "@/app/site/icons";
import { changeSlugAction } from "../actions";
import type { Update } from "./ProductEditor";

export function DetailsTab({
  draft,
  update,
  categories,
  slug,
  updatedAt,
  dirty,
  onMoved,
}: {
  draft: ProductDraft;
  update: Update;
  categories: Category[];
  slug: string;
  updatedAt: string;
  dirty: boolean;
  onMoved: (slug: string) => void;
}) {
  const [movedType, setMovedType] = useState<string | null>(null);

  const setCategory = (categoryId: string) => {
    // A type belongs to one category, so it does not follow the product to another.
    const [type] = tagValues(draft.tags, "type");
    const keeps = !type || findTerm("type", type)?.category === categoryId;
    setMovedType(keeps ? null : findTerm("type", type)?.label ?? type);
    update({ categoryId, tags: keeps ? draft.tags : draft.tags.filter((t) => !t.startsWith("type:")) });
  };

  return (
    <div className="panel">
      <section className="group">
        <TextInput
          id="field-name"
          label="Name"
          value={draft.name}
          onChange={(e) => update({ name: e.currentTarget.value })}
          error={!draft.name.trim() ? "A product needs a name" : undefined}
        />

        <div className="row">
          <TextInput
            id="field-code"
            className="row__narrow"
            label="Shop code"
            value={draft.code}
            onChange={(e) => {
              const code = normaliseCode(e.currentTarget.value);
              update({ code, variants: recodeVariants(draft.code, code, draft.variants) });
            }}
            classNames={{ input: "mono" }}
            error={!draft.code ? "A product needs its code" : undefined}
          />
          <div className="row__grow">
            <Select
              label="Category"
              data={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={draft.categoryId}
              onChange={(v) => v && setCategory(v)}
              allowDeselect={false}
            />
            {movedType ? (
              <p className="hint hint--warn" role="status">
                “{movedType}” was taken off with the old category. Choose a new type under Shop filters.
              </p>
            ) : null}
          </div>
        </div>

        <WebAddress slug={slug} updatedAt={updatedAt} name={draft.name} dirty={dirty} onMoved={onMoved} />
      </section>

      <section className="group">
        <Textarea
          label="Description"
          description="What it is, what it’s made of, who it suits."
          value={draft.description}
          onChange={(e) => update({ description: e.currentTarget.value })}
          autosize
          minRows={4}
          maxRows={14}
        />
        <Specifications specs={draft.specifications} set={(specifications) => update({ specifications })} />
        <Textarea
          label="Care notes"
          description="Optional, e.g. “Hand wash only.”"
          value={draft.careNotes ?? ""}
          onChange={(e) => update({ careNotes: e.currentTarget.value || null })}
          autosize
          minRows={2}
          maxRows={8}
        />
      </section>
    </div>
  );
}

/**
 * The product page's address. Set from the name when the product was made and
 * then left alone, because links, searches and shared messages point at it;
 * changing it is deliberate, and the old address goes on working.
 */
function WebAddress({
  slug,
  updatedAt,
  name,
  dirty,
  onMoved,
}: {
  slug: string;
  updatedAt: string;
  name: string;
  dirty: boolean;
  onMoved: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState(slug);
  const [error, setError] = useState<string | null>(null);
  const [moving, startMoving] = useTransition();

  const valid = SLUG_PATTERN.test(next);
  const move = () =>
    startMoving(async () => {
      const result = await changeSlugAction(slug, next, updatedAt);
      if ("error" in result) return setError(result.error);
      setOpen(false);
      onMoved(result.slug);
    });

  return (
    <div className="field">
      <p className="field__label">Web address</p>
      <div className="address">
        <span className="mono address__path">/shop/product/{slug}</span>
        <Button
          variant="light"
          size="sm"
          onClick={() => {
            setNext(slugify(name) || slug);
            setError(null);
            setOpen(true);
          }}
          disabled={dirty}
        >
          Change web address
        </Button>
      </div>
      {dirty ? <p className="hint">Save or discard your changes first, then change the address.</p> : null}

      <Modal opened={open} onClose={() => setOpen(false)} title="Change web address" centered radius="lg">
        <div className="stack">
          <p>The old address keeps working: it sends people on to the new one.</p>
          <TextInput
            label="New address"
            leftSection={<span className="mono address__prefix">/shop/product/</span>}
            leftSectionWidth={128}
            classNames={{ input: "mono" }}
            value={next}
            onChange={(e) => {
              setNext(e.currentTarget.value.toLowerCase().replace(/\s+/g, "-"));
              setError(null);
            }}
            error={error ?? (!valid && next ? "Lower-case letters, numbers and single hyphens only" : undefined)}
            data-autofocus
          />
          <div className="confirm__actions">
            <Button variant="subtle" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={move} loading={moving} disabled={!valid || next === slug}>
              Change address
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * The facts under "Details and care" on the product page, one measurement or
 * material per line. Enter starts a new line; Backspace on an empty one removes it.
 */
function Specifications({ specs, set }: { specs: string[]; set: (next: string[]) => void }) {
  const list = useRef<HTMLOListElement>(null);

  const focusRow = (i: number) =>
    requestAnimationFrame(() => list.current?.querySelectorAll<HTMLInputElement>("input")[i]?.focus());
  const add = (at = specs.length) => {
    set([...specs.slice(0, at), "", ...specs.slice(at)]);
    focusRow(at);
  };
  const move = (from: number, to: number) => {
    const next = [...specs];
    [next[from], next[to]] = [next[to], next[from]];
    set(next);
    focusRow(to);
  };

  return (
    <div className="field" role="group" aria-labelledby="specs-title">
      <p id="specs-title" className="field__label">
        Measurements and materials
      </p>
      <p className="hint field__hint">One per line, e.g. “20 × 30 cm”. Size diagrams go under Photos.</p>
      {specs.length ? (
        <ol ref={list} className="specs">
          {specs.map((s, i) => (
            <li key={i} className="specs__row">
              <TextInput
                aria-label={`Measurement or material ${i + 1}`}
                value={s}
                onChange={(e) => set(specs.map((x, j) => (j === i ? e.currentTarget.value : x)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(i + 1);
                  }
                  if (e.key === "Backspace" && s === "") {
                    e.preventDefault();
                    set(specs.filter((_, j) => j !== i));
                    focusRow(Math.max(0, i - 1));
                  }
                }}
                className="specs__input"
              />
              <Button variant="subtle" size="sm" px={10} aria-label={`Move line ${i + 1} up`} onClick={() => move(i, i - 1)} disabled={i === 0}>
                <ArrowUp size={18} />
              </Button>
              <Button variant="subtle" size="sm" px={10} aria-label={`Move line ${i + 1} down`} onClick={() => move(i, i + 1)} disabled={i === specs.length - 1}>
                <ArrowDown size={18} />
              </Button>
              <Button variant="subtle" color="red" size="sm" px={10} aria-label={`Remove line ${i + 1}`} onClick={() => set(specs.filter((_, j) => j !== i))}>
                <Trash size={18} />
              </Button>
            </li>
          ))}
        </ol>
      ) : null}
      <Button variant="light" leftSection={<Plus size={18} />} onClick={() => add()} className="specs__add">
        Add a line
      </Button>
    </div>
  );
}
