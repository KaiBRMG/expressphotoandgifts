import type { InputHTMLAttributes, ReactNode } from "react";

import { PASSWORD_MIN } from "@/lib/checkout/details";
import { Alert, Check } from "@/app/site/icons";

/**
 * One labelled field with its error under it. The error is a glyph and words,
 * never colour alone, and is tied to the input for a screen reader.
 */
export function Field({
  id,
  label,
  hint,
  error,
  wide = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="field" data-wide={wide || undefined} data-invalid={error ? "" : undefined}>
      <label className="field__label" htmlFor={id}>
        {label}
        {hint ? <span> {hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          <Alert size={18} />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "12 characters left", once a field with a limit is within 20 of it. */
export function CharsLeft({ value, max }: { value: string; max: number }) {
  const left = max - value.length;
  if (left > 20) return null;
  return (
    <p className="chars-left" aria-live="polite">
      {left} {left === 1 ? "character" : "characters"} left
    </p>
  );
}

/** The input's own attributes, with the error wired to it. */
export const inputProps = (id: string, error: string | undefined): InputHTMLAttributes<HTMLInputElement> => ({
  id,
  name: id,
  className: "field__input",
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : undefined,
});

/** A password for a new customer account: at checkout as they pay, or on the receipt after. */
export function NewPasswordField({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <Field id={id} label={label} hint={`at least ${PASSWORD_MIN} characters`} error={error}>
      <input
        {...inputProps(id, error)}
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </Field>
  );
}

/**
 * A message after an action: what went wrong or what was done, as a glyph
 * on an amber disc and words, told to a screen reader as it appears.
 * `className` sets it in a panel (`.anote`).
 */
export function Note({ error = false, className, children }: { error?: boolean; className?: string; children: ReactNode }) {
  return (
    <p className={`${error ? "field__error" : "receipt__saved"}${className ? ` ${className}` : ""}`} role={error ? "alert" : "status"}>
      {error ? <Alert size={18} /> : <Check size={20} />}
      {children}
    </p>
  );
}
