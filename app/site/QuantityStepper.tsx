"use client";

import { MAX_QUANTITY, clampQuantity } from "@/lib/catalog/purchase";
import { Minus, Plus } from "./icons";

/**
 * A pill holding two 44px round steps and the count between them, on the
 * product page and on each line of the cart. Typing keeps digits only, and
 * every value is held to 1…MAX_QUANTITY before it is handed on.
 */
export function QuantityStepper({
  value,
  onChange,
  id,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  /** For a visible `<label htmlFor>`. */
  id?: string;
  /** What is being counted, for the steps' names and, without an `id`, the field's. */
  label?: string;
}) {
  const set = (n: number) => onChange(clampQuantity(n));
  const of = label ? ` ${label}` : "";

  return (
    <div className="qty">
      <button
        type="button"
        className="qty__step"
        aria-label={`One fewer${of}`}
        disabled={value <= 1}
        onClick={() => set(value - 1)}
      >
        <Minus size={20} />
      </button>
      <input
        id={id}
        className="qty__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={id ? undefined : `Quantity of${of}`}
        value={value}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        className="qty__step"
        aria-label={`One more${of}`}
        disabled={value >= MAX_QUANTITY}
        onClick={() => set(value + 1)}
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
