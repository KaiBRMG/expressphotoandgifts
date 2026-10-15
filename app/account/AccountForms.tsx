"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Alert, Check, SignOut } from "@/app/site/icons";
import { Field, inputProps } from "@/app/checkout/Field";
import { resetPasswordAction, signInAction, signOutAction, type AccountState } from "./actions";

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
