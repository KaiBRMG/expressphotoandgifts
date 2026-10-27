"use client";

import { useState, useTransition } from "react";
import { Button, Modal, TagsInput, TextInput, Tooltip } from "@mantine/core";
import { LIMITS, normaliseCode, recodeVariants, SLUG_MAX, SLUG_PATTERN, slugFor, slugify, type ProductDraft } from "@/lib/catalog/edit";
import { tagValues, withFacet } from "@/lib/catalog/tags";
import { changeSlugAction } from "../actions";
import type { ErrorOn, Suggestions, Update } from "./ProductEditor";
import { Tip } from "../Tip";
import { Where } from "./Where";

/**
 * The shop's own records for a product, under the tabs rather than in one:
 * set once when it is made and rarely touched, and never something a
 * shopper meets on a shelf, a page or at checkout.
 */
export function Records({
  draft,
  errorOn,
  update,
  suggestions,
  slug,
  updatedAt,
  dirty,
  onMoved,
}: {
  draft: ProductDraft;
  errorOn: ErrorOn;
  update: Update;
  suggestions: Suggestions;
  slug: string;
  updatedAt: string;
  dirty: boolean;
  onMoved: (slug: string) => void;
}) {
  return (
    <section className="records" aria-labelledby="records-title">
      <div className="group__head">
        <h2 id="records-title" className="group__title">
          Shop records
        </h2>
        <p className="hint">
          <Where internal>Set when the product was made, and rarely changed.</Where>
        </p>
      </div>

      <div className="records__grid">
        <TextInput
          id="field-code"
          label={
            <span className="label-tip">
              Product code
              <Tip about="the product code">
                Changing it renames the order codes made from it. Past orders keep the codes they were placed with.
              </Tip>
            </span>
          }
          description="Letters and numbers, starting with a letter. Each order code under Sizes & prices starts with it."
          value={draft.code}
          maxLength={LIMITS.code}
          onChange={(e) => {
            const code = normaliseCode(e.currentTarget.value);
            update({ code, variants: recodeVariants(draft.code, code, draft.variants) });
          }}
          classNames={{ input: "mono" }}
          error={errorOn("field-code")}
        />
        <TagsInput
          id="field-process"
          label="How the shop makes it"
          maxTags={LIMITS.processes}
          error={errorOn("field-process")}
          description="e.g. sublimation."
          data={suggestions.processes}
          value={tagValues(draft.tags, "process")}
          onChange={(v) => update({ tags: withFacet(draft.tags, "process", [...new Set(v.map(slugify).filter(Boolean))]) })}
          splitChars={[","]}
          clearable
        />
      </div>

      <WebAddress slug={slug} updatedAt={updatedAt} name={draft.name} dirty={dirty} onMoved={onMoved} />
    </section>
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
      <p className="hint field__hint">The link to its product page, the one shoppers share and search engines list.</p>
      <div className="address">
        <span className="mono address__path">/shop/product/{slug}</span>
        <Tooltip label="The old address keeps working: it sends people on to the new one.">
          <Button
            variant="light"
            size="sm"
            onClick={() => {
              setNext(slugFor(name) || slug);
              setError(null);
              setOpen(true);
            }}
            disabled={dirty}
          >
            Change web address
          </Button>
        </Tooltip>
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
            maxLength={SLUG_MAX}
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
