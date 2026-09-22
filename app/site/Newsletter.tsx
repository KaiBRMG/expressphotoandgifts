"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowRight } from "./icons";

/**
 * The footer sign-up. There is no list to post to yet, so this pass keeps the
 * whole exchange on the client: the field validates, the submit is swallowed,
 * and the form is replaced by an acknowledgement. Point `onSubmit` at the real
 * endpoint when the mailing list exists — nothing else here needs to move.
 */
export function Newsletter() {
  const [done, setDone] = useState(false);
  const doneRef = useRef<HTMLParagraphElement>(null);

  /* Submitting unmounts the button that had focus, which would drop a
     keyboard user back at the top of the document. Catch it on the message
     that replaced it, so the next Tab carries on from here. */
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (done) {
    return (
      <p
        className="newsletter__done"
        ref={doneRef}
        tabIndex={-1}
        role="status"
      >
        Thanks — we&rsquo;ll be in touch when something good comes off the
        printer.
      </p>
    );
  }

  return (
    <>
      <form
        className="newsletter"
        onSubmit={(event) => {
          event.preventDefault();
          setDone(true);
        }}
      >
        <label className="visually-hidden" htmlFor="newsletter-email">
          Email address
        </label>
        <input
          id="newsletter-email"
          className="newsletter__input"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Enter your email"
        />
        <button
          className="newsletter__submit"
          type="submit"
          aria-label="Sign up"
        >
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="newsletter__fine">
        By entering your email you agree to receive email marketing from
        Express Photo and Gifts at your email address. Unsubscribe any time.
      </p>
    </>
  );
}
