import type { InputHTMLAttributes, ReactNode } from "react";

import { Alert } from "@/app/site/icons";

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

/** The input's own attributes, with the error wired to it. */
export const inputProps = (id: string, error: string | undefined): InputHTMLAttributes<HTMLInputElement> => ({
  id,
  name: id,
  className: "field__input",
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : undefined,
});
