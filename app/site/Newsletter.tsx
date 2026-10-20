"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { footerSignUp, lookupSignUpEmail, resetPasswordAction } from "@/app/account/actions";
import { isEmail, PASSWORD_MIN, passwordError } from "@/lib/checkout/details";
import { Alert, ArrowRight } from "./icons";

/** How long typing has to pause before the email is looked up. */
const LOOKUP_DELAY = 450;

/** Where the email stands: not yet looked up, being looked up, or known to be new or taken. */
type Lookup =
  | { state: "idle" }
  | { state: "checking"; email: string }
  | { state: "known"; email: string; exists: boolean };

/**
 * The footer sign-up, email first. Once the line holds an email (typing has
 * paused, the field is left, or the arrow is pressed) the server says
 * whether it already has an account, and a password line opens under it:
 * choose one to make the account, or, when the email is taken, the one it
 * already has to sign in. Either way the marketing consent in the small
 * print is recorded with it. Editing the email closes the password line
 * again, so it always answers to the address above it.
 */
export function Newsletter() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState<"created" | "signedIn" | null>(null);
  const [pending, startTransition] = useTransition();
  const doneRef = useRef<HTMLParagraphElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  /* The address the latest lookup was asked about: an answer for any other
     one arrived after the email changed, and is dropped. */
  const asked = useRef("");

  const trimmed = email.trim();
  const known = lookup.state === "known" && lookup.email === trimmed ? lookup : null;
  const open = known !== null;

  function check(address: string, focusAfter = false) {
    if (!isEmail(address) || asked.current === address) return;
    asked.current = address;
    setLookup({ state: "checking", email: address });
    setError(null);
    lookupSignUpEmail(address).then((result) => {
      if (asked.current !== address) return;
      if ("error" in result) {
        asked.current = "";
        setLookup({ state: "idle" });
        setError(result.error);
        return;
      }
      setLookup({ state: "known", email: address, exists: result.exists });
      if (focusAfter) requestAnimationFrame(() => passwordRef.current?.focus());
    });
  }

  /* Look the email up once typing pauses on something that reads as one. */
  useEffect(() => {
    if (!isEmail(trimmed) || asked.current === trimmed) return;
    const timer = setTimeout(() => check(trimmed), LOOKUP_DELAY);
    return () => clearTimeout(timer);
  }, [trimmed]);

  /* Submitting unmounts the button that had focus, which would drop a
     keyboard user back at the top of the document. Catch it on the message
     that replaced it, so the next Tab carries on from here. */
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (done) {
    return (
      <p className="newsletter__done" ref={doneRef} tabIndex={-1} role="status">
        {done === "created"
          ? "You’re signed up and signed in. We’ll be in touch when something good comes off the printer."
          : "You’re signed in. Checkout will fill in your saved details."}{" "}
        <Link className="inline-link" href="/account">
          Your account
        </Link>
      </p>
    );
  }

  function submit() {
    if (pending) return;
    setNotice(null);
    if (!open) {
      if (!isEmail(trimmed)) setError("Enter your email address.");
      else check(trimmed, true);
      return;
    }
    const wrong = known.exists ? (password ? undefined : "Enter your password.") : passwordError(password);
    if (wrong) {
      setError(wrong);
      passwordRef.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await footerSignUp(trimmed, password, known.exists);
      if ("done" in result) {
        setDone(result.done);
        router.refresh();
        return;
      }
      if (result.exists && !known.exists) {
        setLookup({ state: "known", email: trimmed, exists: true });
        setPassword("");
      }
      setError(result.error);
      passwordRef.current?.focus();
    });
  }

  const status =
    lookup.state === "checking" && lookup.email === trimmed
      ? "Checking…"
      : known?.exists
        ? "This email already has an account. Enter its password to sign in."
        : known
          ? "New here. Choose a password to make your account."
          : "";

  return (
    <>
      <form
        className="newsletter"
        data-open={open || undefined}
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
            required
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            aria-describedby="newsletter-status"
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
              setNotice(null);
              if (e.target.value.trim() !== asked.current) {
                asked.current = "";
                setPassword("");
              }
            }}
            onBlur={() => check(trimmed)}
          />
          {!open ? (
            <button className="newsletter__submit" type="submit" aria-label="Continue">
              <ArrowRight size={17} />
            </button>
          ) : null}
        </div>

        <p className="newsletter__status" id="newsletter-status" role="status" data-exists={known?.exists || undefined}>
          {status}
        </p>

        {/* The password line opens under the email once it is known, and is
            out of the tab order and the accessibility tree until then. */}
        <div className="newsletter__more" inert={!open || undefined}>
          <div>
            <div className="newsletter__line">
              <label className="visually-hidden" htmlFor="newsletter-password">
                {known?.exists ? "Password" : "Choose a password"}
              </label>
              <input
                ref={passwordRef}
                id="newsletter-password"
                className="newsletter__input"
                type="password"
                name="password"
                autoComplete={known?.exists ? "current-password" : "new-password"}
                minLength={known?.exists ? undefined : PASSWORD_MIN}
                placeholder={known?.exists ? "Your password" : `Choose a password (${PASSWORD_MIN}+ characters)`}
                value={password}
                aria-invalid={error && open ? true : undefined}
                aria-describedby={error ? "newsletter-error" : "newsletter-status"}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
              <button
                className="newsletter__submit"
                type="submit"
                aria-label={known?.exists ? "Sign in" : "Sign up"}
                aria-disabled={pending || undefined}
              >
                <ArrowRight size={17} />
              </button>
            </div>
            {known?.exists ? (
              <button
                type="button"
                className="inline-link newsletter__forgot"
                onClick={async () => {
                  setError(null);
                  const said = await resetPasswordAction(trimmed);
                  if (said?.error) setError(said.error);
                  else setNotice(said?.notice ?? null);
                }}
              >
                Forgot your password?
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="newsletter__error" id="newsletter-error" role="alert">
            <Alert size={17} />
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="newsletter__status" role="status">
            {notice}
          </p>
        ) : null}
      </form>
      <p className="newsletter__fine">
        By entering your email you agree to receive email marketing from
        Express Photo and Gifts at your email address. Unsubscribe any time.
      </p>
    </>
  );
}
