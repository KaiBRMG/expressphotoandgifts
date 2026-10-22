"use client";

import { useState, useTransition } from "react";
import { Button } from "@mantine/core";
import { adoptHandSpecialsAction } from "../actions";

/** Turns the products put on Specials by hand, before campaigns, into one draft campaign, and opens it. */
export function AdoptSpecials({ names }: { names: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [working, start] = useTransition();
  const n = names.length;
  return (
    <div className="checklist camp__adopt" role="region" aria-label="Specials set by hand">
      <p className="checklist__title">
        {n === 1 ? "1 product was" : `${n} products were`} put on Specials by hand, before campaigns.
      </p>
      <p className="hint">
        {new Intl.ListFormat("en-ZA").format(names.slice(0, 4))}
        {n > 4 ? ` and ${n - 4} more` : ""}. The shelf now follows campaigns, so {n === 1 ? "it’s" : "they’re"} off it until one covers {n === 1 ? "it" : "them"}.
      </p>
      <div>
        <Button loading={working} onClick={() => start(async () => setError((await adoptHandSpecialsAction())?.error ?? null))}>
          Make {n === 1 ? "it" : "them"} a draft campaign
        </Button>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
    </div>
  );
}
