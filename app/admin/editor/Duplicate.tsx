"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Popover, TextInput } from "@mantine/core";
import { codeProblem, LIMITS, normaliseCode } from "@/lib/catalog/edit";
import { duplicateProductAction } from "../actions";

/**
 * Starts a sibling product from this one: the shop's catalogue runs in families
 * (one mug, several handle colours), so a hidden copy under its own code is
 * quicker than a new product from nothing. It copies the saved version, so
 * unsaved changes are saved or dropped first.
 */
export function Duplicate({ slug, dirty }: { slug: string; dirty: boolean }) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await duplicateProductAction(slug, code).catch(() => ({ error: "The copy wasn’t made. Check the connection and try again." }));
      if ("error" in result) return setError(result.error);
      setOpened(false);
      router.push(`/admin/products/${result.slug}`);
    });
  };

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" withArrow shadow="md" trapFocus returnFocus>
      <Popover.Target>
        <Button variant="subtle" onClick={() => setOpened((o) => !o)} className="editor__view">
          Duplicate
        </Button>
      </Popover.Target>
      <Popover.Dropdown className="confirm">
        {dirty ? (
          <>
            <p>Save or discard your changes first. The copy is made from the saved version.</p>
            <div className="confirm__actions">
              <Button variant="subtle" onClick={() => setOpened(false)}>
                Close
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="stack stack--tight">
            <p>A hidden copy with its own product code, e.g. for another colour. Prices, photos and filters come with it.</p>
            <TextInput
              label="Product code for the copy"
              value={code}
              onChange={(e) => {
                setCode(normaliseCode(e.currentTarget.value));
                setError(null);
              }}
              error={error ?? (code ? codeProblem(code) : null)}
              maxLength={LIMITS.code}
              classNames={{ input: "mono" }}
              data-autofocus
              required
            />
            <div className="confirm__actions">
              <Button variant="subtle" onClick={() => setOpened(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} disabled={Boolean(codeProblem(code))}>
                Make the copy
              </Button>
            </div>
          </form>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
