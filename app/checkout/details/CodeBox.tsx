"use client";

import { useEffect, useRef, useState } from "react";

import { formatCode } from "@/lib/catalog/codes";
import { rands } from "@/lib/catalog/listing";
import { cart, type AppliedCode } from "@/app/site/cartStore";
import { Field, inputProps, Note } from "../Field";
import { checkCodeAction } from "./actions";

/**
 * Where a customer enters the one-time code their email gave them. Closed to
 * a line of words, so it doesn't pull attention from paying; open, a field
 * and Apply. The server says whether the code can be used and sends the
 * campaign it brings, which the cart then prices with; nothing is used up
 * until the order is paid, and Pay checks the code again. A code kept from an
 * earlier visit is asked about once when the page opens, since it may have
 * been used since.
 *
 * Not a nested form: the page is one form, so Enter here applies the code
 * rather than paying.
 */
export function CodeBox({ applied, saved }: { applied: AppliedCode | null; saved: number }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  // A code the cart held from before: still good? Asked once, when the page opens.
  const kept = useRef(applied?.code ?? null);
  useEffect(() => {
    if (!kept.current) return;
    let current = true;
    checkCodeAction(kept.current)
      .then((r) => {
        if (!current) return;
        if (r.ok) cart.applyCode({ code: r.code, deal: r.deal });
        else {
          cart.removeCode();
          setError(r.error);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);

  const apply = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await checkCodeAction(value).catch(() => ({ ok: false as const, error: "We couldn’t reach the shop’s server. Check your connection and try again." }));
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      field.current?.focus();
      return;
    }
    cart.applyCode({ code: r.code, deal: r.deal });
    setValue("");
    setOpen(false);
  };

  if (applied) {
    return (
      <div className="acct codebox" role="group" aria-label="Discount code">
        <p>
          Code <strong className="codebox__code">{formatCode(applied.code)}</strong> is on your order: <strong>{applied.deal.name}</strong>.{" "}
          <button type="button" className="inline-link" onClick={() => cart.removeCode()}>
            Remove
          </button>
        </p>
        {saved > 0 ? (
          <Note>You save {rands(saved)} with it. It is used up when you pay.</Note>
        ) : (
          <Note error>Nothing in your cart is part of this deal, so it saves nothing yet. Your code stays unused until it does.</Note>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="acct codebox">
        <p>
          Have a discount code?{" "}
          <button
            type="button"
            className="inline-link"
            onClick={() => {
              setOpen(true);
              setTimeout(() => field.current?.focus(), 0);
            }}
          >
            Enter it
          </button>
        </p>
        {error ? <Note error>{error}</Note> : null}
      </div>
    );
  }

  return (
    <div
      className="acct acct--open codebox"
      role="group"
      aria-label="Discount code"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          apply();
        }
      }}
    >
      <Field id="discount-code" label="Discount code" hint="from your email" error={error ?? undefined}>
        <input
          {...inputProps("discount-code", error ?? undefined)}
          ref={field}
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={24}
          placeholder="K7M4Q-9XPD2"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <p className="acct__acts">
        <button type="button" className="btn btn--blue" onClick={apply} aria-disabled={!value.trim() || busy || undefined}>
          {busy ? "Checking…" : "Apply"}
        </button>
        <button
          type="button"
          className="inline-link"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Not now
        </button>
      </p>
    </div>
  );
}
