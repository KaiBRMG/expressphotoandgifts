"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cart } from "@/app/site/cartStore";
import { PASSWORD_MIN } from "@/lib/checkout/details";
import { Check } from "@/app/site/icons";
import { createAccountFromOrder, type AccountState } from "@/app/account/actions";
import { Field, inputProps } from "../Field";
import { photos, usePhotos } from "../photoStore";
import { receiptStatus } from "./actions";

/** Listening for PayFast's notice: every few seconds at first, less often as it takes longer, and not for ever. */
const FIRST_MS = 2_500;
const MOST_MS = 30_000;
const SLOW_MS = 45_000;
const GIVE_UP_MS = 10 * 60_000;

/**
 * The order is paid: the cart empties and the photo step starts afresh under
 * a new reference. Only when this browser's photos belong to this order, so
 * opening an old receipt never clears a cart in progress.
 */
export function Finish({ ref_ }: { ref_: string }) {
  const store = usePhotos();
  useEffect(() => {
    if (store.ref !== ref_) return;
    cart.clear();
    photos.finish();
  }, [store.ref, ref_]);
  return (
    <p className="receipt__paid" role="status">
      <Check size={22} />
      Payment received
    </p>
  );
}

/**
 * Listens for PayFast's notice, and redraws the receipt once the order is
 * paid. Each wait is longer than the last, nothing is asked while the tab is
 * hidden, and after ten minutes it stops: a reload asks again.
 */
export function Waiting({ ref_, token }: { ref_: string; token: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const started = Date.now();
    let wait = FIRST_MS;
    let timer: ReturnType<typeof setTimeout>;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      if (!document.hidden) {
        const status = await receiptStatus(ref_, token).catch(() => null);
        if (stop) return;
        if (status === "paid") return router.refresh();
      }
      const waited = Date.now() - started;
      if (waited > SLOW_MS) setSlow(true);
      if (waited > GIVE_UP_MS) return;
      wait = Math.min(wait * 1.5, MOST_MS);
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, wait);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [ref_, token, router]);

  return (
    <p className="receipt__wait" role="status">
      <span className="services__spin" aria-hidden="true" />
      {slow
        ? "This is taking longer than usual. If you paid, PayFast has emailed you a receipt and the shop will see your order. Reload this page in a few minutes to see it confirmed."
        : "Waiting for PayFast to confirm…"}
    </p>
  );
}

/** One field: a password, to save this order's details for next time. */
export function SaveAccount({ ref_, token, email }: { ref_: string; token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<AccountState>(null);
  const [busy, setBusy] = useState(false);

  if (state?.notice) {
    return (
      <section className="receipt__account">
        <p className="receipt__saved" role="status">
          <Check size={20} />
          {state.notice}
        </p>
      </section>
    );
  }

  return (
    <section className="receipt__account" aria-labelledby="receipt-save">
      <h2 id="receipt-save" className="costep__title">
        Save your details for next time
      </h2>
      <p className="receipt__soft">
        Choose a password and your name, number and address fill themselves in at checkout. Your email, {email}, signs you in.
      </p>
      <form
        className="saveacct"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setState(await createAccountFromOrder(ref_, token, password).catch(() => ({ error: "That didn’t work. Check your connection and try again." })));
          setBusy(false);
        }}
      >
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <Field id="new-password" label="Password" hint={`at least ${PASSWORD_MIN} characters`} error={state?.error}>
          <input
            {...inputProps("new-password", state?.error)}
            type="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn--blue" aria-disabled={busy || undefined}>
          {busy ? "Saving…" : "Save my details"}
        </button>
      </form>
    </section>
  );
}
