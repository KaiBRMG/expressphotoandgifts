"use client";

import Link from "next/link";

import { POLICIES_VERSION } from "@/lib/legal";

/**
 * The two ticks for making an account, apart because they are different
 * things: the first agrees to the policies and is needed; the second is
 * marketing email and never is. Each carries its value when it has a `name`,
 * so a form posts them as they stand: the terms box the policies' version it
 * was shown at, the marketing box "yes".
 */
export function AccountAgreements({
  id,
  terms,
  onTerms,
  marketing,
  onMarketing,
  named = false,
  error,
}: {
  id: string;
  terms: boolean;
  onTerms: (on: boolean) => void;
  marketing: boolean;
  onMarketing: (on: boolean) => void;
  named?: boolean;
  error?: string;
}) {
  return (
    <div className="agrees">
      <label className="check agrees__row">
        <input
          id={`${id}-terms`}
          type="checkbox"
          {...(named ? { name: "terms", value: POLICIES_VERSION } : {})}
          checked={terms}
          onChange={(e) => onTerms(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-terms-error` : undefined}
          required
        />
        <span>
          I agree to the{" "}
          <Link className="inline-link" href="/terms" target="_blank">
            Terms &amp; Conditions
          </Link>{" "}
          and the{" "}
          <Link className="inline-link" href="/privacy" target="_blank">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <label className="check agrees__row">
        <input id={`${id}-marketing`} type="checkbox" {...(named ? { name: "marketing", value: "yes" } : {})} checked={marketing} onChange={(e) => onMarketing(e.target.checked)} />
        <span>
          Email me specials and campaigns. <span className="agrees__soft">Optional: you can switch it off at any time, and order emails always come.</span>
        </span>
      </label>
    </div>
  );
}
