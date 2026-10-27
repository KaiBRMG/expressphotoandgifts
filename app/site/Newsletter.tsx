"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import { subscribeAction } from "@/app/subscription/actions";
import { isEmail } from "@/lib/checkout/details";
import { Alert } from "./icons";

/**
 * The footer's "Email me specials": one field. Pressing Subscribe emails the
 * address a link, and only following it subscribes, so the form can say
 * nothing about whether the address is already a customer's and nobody can
 * sign up an address that isn't theirs. Accounts are made elsewhere (checkout,
 * a receipt, `/account`); the line under the form is the way in for those who
 * have one.
 */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const doneRef = useRef<HTMLParagraphElement>(null);

  /* Submitting unmounts the button that had focus, which would drop a
     keyboard user back at the top of the document. Catch it on the message
     that replaced it, so the next Tab carries on from here. */
  useEffect(() => {
    if (sentTo) doneRef.current?.focus();
  }, [sentTo]);

  function submit() {
    if (pending) return;
    const address = email.trim();
    if (!isEmail(address)) {
      setError("Enter your email address.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await subscribeAction(address);
      if ("error" in result) setError(result.error);
      else setSentTo(address);
    });
  }

  return (
    <>
      {sentTo ? (
        <p className="newsletter__done" ref={doneRef} tabIndex={-1} role="status">
          Check {sentTo} for an email from us and tap the link in it. You’re on the list once you do.
        </p>
      ) : (
        <form
          className="newsletter"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="newsletter__line">
            <label className="visually-hidden" htmlFor="newsletter-email">
              Email address
            </label>
            <input
              id="newsletter-email"
              className="newsletter__input"
              type="email"
              name="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "newsletter-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
            <button className="newsletter__submit" type="submit" aria-disabled={pending || undefined}>
              {pending ? "Sending…" : "Subscribe"}
            </button>
          </div>

          {error ? (
            <p className="newsletter__error" id="newsletter-error" role="alert">
              <Alert size={17} />
              {error}
            </p>
          ) : null}
        </form>
      )}

      <p className="newsletter__fine">
        Emails about your orders always come. Specials and campaigns only once you tap the link we send, and every one has a link to stop them. Our{" "}
        <Link className="inline-link" href="/privacy">
          Privacy Policy
        </Link>{" "}
        says how we use it.
      </p>
      <p className="newsletter__account">
        <Link className="inline-link" href="/account">
          Have an account? Sign in
        </Link>
        <Link className="inline-link" href="/account#new">
          New here? Make an account
        </Link>
      </p>
    </>
  );
}
