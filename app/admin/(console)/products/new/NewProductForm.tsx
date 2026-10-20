"use client";

import { useActionState, useState } from "react";
import { Button, Select, TextInput } from "@mantine/core";
import { codeProblem, LIMITS, nameProblem, normaliseCode, slugFor } from "@/lib/catalog/edit";
import { createProductAction } from "../../../actions";

export function NewProductForm({ categories }: { categories: { value: string; label: string }[] }) {
  const [state, action, creating] = useActionState(createProductAction, null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  // Chosen on purpose: the category decides which types it can take.
  const [category, setCategory] = useState<string | null>(null);
  // The server's refusal stays on its field until that field is changed.
  const [touched, setTouched] = useState<string | null>(null);
  // A field's own check shows once it has been left, so an empty form doesn't open on errors.
  const [left, setLeft] = useState<Set<string>>(() => new Set());
  const leave = (field: string) => setLeft((s) => new Set(s).add(field));
  const slug = slugFor(name);
  const problems = { name: nameProblem(name), code: codeProblem(code), categoryId: null };
  const errorOn = (field: keyof typeof problems) =>
    state?.field === field && touched !== field ? state.error : left.has(field) ? problems[field] ?? undefined : undefined;

  return (
    <form action={action} onSubmit={() => setTouched(null)} className="stack form-narrow">
      <TextInput
        label="Name"
        name="name"
        description="The title on its card and its page, e.g. “Photo Mug, Black Handle”."
        value={name}
        maxLength={LIMITS.name}
        onBlur={() => leave("name")}
        onChange={(e) => {
          setName(e.currentTarget.value);
          setTouched("name");
        }}
        error={errorOn("name")}
        required
        autoFocus
      />
      <TextInput
        label="Product code"
        name="code"
        description="Shoppers don’t see it. Letters and numbers, starting with a letter; its order codes start with it, e.g. MG3."
        value={code}
        maxLength={LIMITS.code}
        onBlur={() => leave("code")}
        onChange={(e) => {
          setCode(normaliseCode(e.currentTarget.value));
          setTouched("code");
        }}
        error={errorOn("code")}
        classNames={{ input: "mono" }}
        required
      />
      <Select
        label="Category"
        name="categoryId"
        placeholder="Choose a category"
        description="The shelf it sits on in the shop."
        data={categories}
        value={category}
        onChange={(v) => {
          setCategory(v);
          setTouched("categoryId");
        }}
        error={errorOn("categoryId")}
        allowDeselect={false}
        required
      />

      <p className="hint">
        Web address:{" "}
        <span className="mono">{slug ? `/shop/product/${slug}` : "set from the name"}</span>
      </p>

      <div role="status" aria-live="polite">
        {/* A field's own error is shown on it; this still says it aloud. */}
        {state?.error ? <p className={state.field ? "visually-hidden" : "admin-error"}>{state.error}</p> : null}
      </div>

      <div>
        <Button type="submit" loading={creating} disabled={Boolean(problems.name || problems.code) || !category}>
          Create and continue
        </Button>
      </div>
    </form>
  );
}
