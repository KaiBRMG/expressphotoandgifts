"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { PASSWORD_MIN } from "@/lib/checkout/details";
import { Alert, Check, SignOut } from "@/app/site/icons";
import { Field, inputProps } from "@/app/checkout/Field";
import { makeAccountAction, resetPasswordAction, signInAction, signOutAction, type AccountState } from "./actions";

export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, null);
  const [email, setEmail] = useState("");
  const [reset, setReset] = useState<AccountState>(null);
  const said = reset ?? state;

  return (
    <form className="signin" action={action}>
      <div className="fields">
        <Field id="si-email" label="Email">
          <input
            {...inputProps("si-email", undefined)}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field id="si-password" label="Password">
          <input {...inputProps("si-password", undefined)} name="password" type="password" autoComplete="current-password" />
        </Field>
      </div>
      {said?.error ? (
        <p className="field__error" role="alert">
          <Alert size={18} />
          {said.error}
        </p>
      ) : null}
      {said?.notice ? (
        <p className="receipt__saved" role="status">
          <Check size={20} />
          {said.notice}
        </p>
      ) : null}
      <p className="acct__acts">
        <button type="submit" className="btn btn--blue" aria-disabled={pending || undefined}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <button type="button" className="inline-link" onClick={async () => setReset(await resetPasswordAction(email))}>
          Forgot your password?
        </button>
      </p>
    </form>
  );
}

/** Make an account with no order: an email and a password, and the customer is signed in. */
export function MakeAccountForm() {
  const [state, action, pending] = useActionState(makeAccountAction, null);
  return (
    <form className="signin" action={action}>
      <div className="fields">
        <Field id="ma-email" label="Email">
          <input {...inputProps("ma-email", undefined)} name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field id="ma-password" label="Choose a password" hint={`${PASSWORD_MIN} characters or more`}>
          <input {...inputProps("ma-password", undefined)} name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN} />
        </Field>
      </div>
      {state?.error ? (
        <p className="field__error" role="alert">
          <Alert size={18} />
          {state.error}
        </p>
      ) : null}
      <p className="acct__acts">
        <button type="submit" className="btn btn--blue" aria-disabled={pending || undefined}>
          {pending ? "Making your account…" : "Make my account"}
        </button>
      </p>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="inline-link account__out"
      onClick={async () => {
        await signOutAction();
        router.refresh();
      }}
    >
      <SignOut size={18} />
      Sign out
    </button>
  );
}
