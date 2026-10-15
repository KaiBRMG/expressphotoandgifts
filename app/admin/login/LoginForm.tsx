"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Button, PasswordInput, TextInput } from "@mantine/core";
import { resetPasswordAction, signInAction, type FormState } from "../actions";

export function LoginForm() {
  const [state, action, signingIn] = useActionState(signInAction, null);
  const [reset, setReset] = useState<FormState>(null);
  const [sending, startSending] = useTransition();
  const email = useRef<HTMLInputElement>(null);

  const sendReset = () =>
    startSending(async () => setReset(await resetPasswordAction(email.current?.value ?? "")));

  const message = reset ?? state;

  return (
    <form action={action} className="login__form" noValidate>
      <TextInput
        ref={email}
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
        error={Boolean(state?.error)}
      />
      <PasswordInput
        label="Password"
        name="password"
        autoComplete="current-password"
        required
        error={Boolean(state?.error)}
      />

      <div className="login__status" role="status" aria-live="polite">
        {message?.error ? <p className="admin-error">{message.error}</p> : null}
        {message?.notice ? <p className="login__notice">{message.notice}</p> : null}
      </div>

      <Button type="submit" fullWidth loading={signingIn}>
        Sign in
      </Button>
      <button type="button" className="admin-link login__reset" onClick={sendReset} disabled={sending}>
        {sending ? "Sending a reset link…" : "Forgot your password?"}
      </button>
    </form>
  );
}
