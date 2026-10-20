"use client";

import { useState, useTransition } from "react";
import { Button, Popover, TextInput, Tooltip } from "@mantine/core";
import { TERM_MAX, termProblem, type AddableFacet, type AddedTerm, type Vocabulary } from "@/lib/catalog/tags";
import { Plus } from "@/app/site/icons";
import { addTermAction } from "../actions";

type Props = {
  facet: AddableFacet;
  vocabulary: Vocabulary;
  /** The shelf a new type goes on, by id and by name. */
  category?: { id: string; name: string };
  /** Called once the term is stored: the editor adds it to its list and picks it for this product. */
  onAdded: (term: AddedTerm) => void;
};

const COPY: Record<AddableFacet, { button: string; tip: (shelf: string) => string; label: string; hint: (shelf: string) => string; placeholder: string }> = {
  type: {
    button: "Add a type",
    tip: (shelf: string) => `Make a new button on the ${shelf} shelf, for this product and any other on it.`,
    label: "New type",
    hint: (shelf: string) => `A button across the top of the ${shelf} shelf. Short and plural reads best, e.g. “Coasters”.`,
    placeholder: "e.g. Coasters",
  },
  occasion: {
    button: "Add an occasion",
    tip: () => "Make a new occasion for shoppers to filter by, for this product and any other.",
    label: "New occasion",
    hint: () => "A choice in the shop’s Occasion filter, e.g. “Teacher’s Day”.",
    placeholder: "e.g. Teacher’s Day",
  },
};

/**
 * "+ Add a type" / "+ Add an occasion" at the end of a row of chips. The new
 * term is checked here as it is typed and again on the server, stored straight
 * away (so it is there for every product, saved or not), and picked for this
 * product as an unsaved change.
 */
export function AddTerm({ facet, vocabulary, category, onAdded }: Props) {
  const copy = COPY[facet];
  const shelf = category?.name ?? "this";
  const [opened, setOpened] = useState(false);
  const [label, setLabel] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();

  // Said once something is typed; an empty field is just not ready yet.
  const problem = label.trim() ? termProblem(vocabulary, facet, label, category?.id) : null;

  const close = () => {
    setOpened(false);
    setLabel("");
    setServerError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem || !label.trim()) return;
    startAdding(async () => {
      const result = await addTermAction(facet, label, category?.id).catch(() => ({ error: "It wasn’t added. Check the connection and try again." }));
      if ("error" in result) return setServerError(result.error);
      onAdded(result.term);
      close();
    });
  };

  return (
    <Popover opened={opened} onChange={(o) => (o ? setOpened(true) : close())} position="bottom-start" withArrow shadow="md" trapFocus returnFocus>
      <Popover.Target>
        <Tooltip label={copy.tip(shelf)} events={{ hover: true, focus: true, touch: false }} disabled={opened}>
          <Button variant="default" radius="xl" leftSection={<Plus size={16} />} onClick={() => (opened ? close() : setOpened(true))} className="addterm">
            {copy.button}
          </Button>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown className="confirm">
        <form onSubmit={submit} className="stack stack--tight">
          <TextInput
            label={copy.label}
            description={copy.hint(shelf)}
            placeholder={copy.placeholder}
            value={label}
            maxLength={TERM_MAX + 10}
            onChange={(e) => {
              setLabel(e.currentTarget.value);
              setServerError(null);
            }}
            error={serverError ?? problem}
            rightSection={<span className="addterm__count mono" aria-hidden="true">{label.trim().length}/{TERM_MAX}</span>}
            rightSectionWidth={64}
            data-autofocus
          />
          <p className="hint">It shows in the shop once a product that’s in the shop uses it.</p>
          <div className="confirm__actions">
            <Button variant="subtle" onClick={close} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" loading={adding} disabled={!label.trim() || Boolean(problem)}>
              {copy.button}
            </Button>
          </div>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}
