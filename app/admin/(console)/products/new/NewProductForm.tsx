"use client";

import { useActionState, useState } from "react";
import { Button, Select, TextInput } from "@mantine/core";
import { normaliseCode, slugify } from "@/lib/catalog/edit";
import { createProductAction } from "../../../actions";

export function NewProductForm({ categories }: { categories: { value: string; label: string }[] }) {
  const [state, action, creating] = useActionState(createProductAction, null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<string | null>(categories[0]?.value ?? null);
  const slug = slugify(name);

  return (
    <form action={action} className="stack form-narrow">
      <TextInput
        label="Name"
        name="name"
        description="e.g. “Photo Mug, Black Handle”"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
        autoFocus
      />
      <TextInput
        label="Shop code"
        name="code"
        description="e.g. MG3"
        value={code}
        onChange={(e) => setCode(normaliseCode(e.currentTarget.value))}
        classNames={{ input: "mono" }}
        required
      />
      <Select
        label="Category"
        name="categoryId"
        data={categories}
        value={category}
        onChange={setCategory}
        allowDeselect={false}
        required
      />

      <p className="hint">
        Web address:{" "}
        <span className="mono">{slug ? `/shop/product/${slug}` : "set from the name"}</span>
      </p>

      <div role="status" aria-live="polite">
        {state?.error ? <p className="admin-error">{state.error}</p> : null}
      </div>

      <div>
        <Button type="submit" loading={creating} disabled={!name.trim() || !code || !category}>
          Create and continue
        </Button>
      </div>
    </form>
  );
}
