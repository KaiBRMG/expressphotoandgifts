"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

import type { SavedDetails } from "@/lib/account/auth";
import { stillOnTheWay } from "@/lib/account/words";
import { addressLine, EMPTY_ADDRESS, EMPTY_CONTACT, LIMITS, PROVINCES, type Address, type Contact } from "@/lib/checkout/details";
import { Mail } from "@/app/site/icons";
import { Field, inputProps, NewPasswordField, Note } from "@/app/checkout/Field";
import {
  changePasswordAction,
  deleteAccountAction,
  requestOrderCheck,
  saveDetailsAction,
  setMarketingAction,
  type AccountState,
  type DetailsErrors,
} from "./actions";

export const OFFLINE = { error: "That didn’t work. Check your connection and try again." };

type Said = { text: string; error?: boolean } | null;

/* ---- Saved for checkout -------------------------------------------------- */

/**
 * The details checkout fills in, read back plainly, with an edit in place
 * that uses checkout's own fields. Emptying the address removes it.
 */
export function SavedPanel({ email, saved: initial }: { email: string; saved: SavedDetails | null }) {
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [said, setSaid] = useState<Said>(null);

  if (editing) {
    return (
      <DetailsForm
        email={email}
        saved={saved}
        onDone={(details) => {
          setSaved(details);
          setEditing(false);
          setSaid({ text: "Saved. Checkout will fill these in next time." });
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const name = saved ? `${saved.contact.firstName} ${saved.contact.lastName}`.trim() : "";
  const none = <span className="account__none">Not saved yet</span>;
  return (
    <>
      <dl className="account__list">
        <div>
          <dt>Email</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd>{name || none}</dd>
        </div>
        <div>
          <dt>Mobile</dt>
          <dd>{saved?.contact.phone || none}</dd>
        </div>
        <div>
          <dt>Delivery address</dt>
          <dd>
            {saved?.address ? (
              <>
                {addressLine(saved.address)}, {saved.address.province}
                {saved.address.notes ? <span className="account__none"> · {saved.address.notes}</span> : null}
              </>
            ) : (
              <span className="account__none">None saved. You can still collect from the shop.</span>
            )}
          </dd>
        </div>
      </dl>
      {said ? <Note error={said.error}>{said.text}</Note> : null}
      <button type="button" className="pillbtn account__edit" onClick={() => (setSaid(null), setEditing(true))}>
        {saved ? "Edit details" : "Add your details"}
      </button>
    </>
  );
}

/** The edit itself, mounted fresh each time it opens. The server decides what an empty address means. */
function DetailsForm({ email, saved, onDone, onCancel }: { email: string; saved: SavedDetails | null; onDone: (d: SavedDetails) => void; onCancel: () => void }) {
  const [contact, setContact] = useState<Contact>(saved?.contact ?? { ...EMPTY_CONTACT, email });
  const [address, setAddress] = useState<Address>(saved?.address ?? EMPTY_ADDRESS);
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  type Opts = InputHTMLAttributes<HTMLInputElement> & { wide?: boolean; clean?: (v: string) => string };
  const input = <T extends Contact | Address>(value: T, set: (v: T) => void, k: keyof T & string, label: string, { wide, clean = (v) => v, ...attrs }: Opts) => (
    <Field id={`ac-${k}`} label={label} wide={wide} error={errors[k as keyof DetailsErrors]}>
      <input {...inputProps(`ac-${k}`, errors[k as keyof DetailsErrors])} value={String(value[k])} onChange={(e) => set({ ...value, [k]: clean(e.target.value) })} {...attrs} />
    </Field>
  );
  const you = (k: keyof Contact, label: string, attrs: Opts) => input(contact, setContact, k, label, { maxLength: LIMITS.name, ...attrs });
  const where = (k: Exclude<keyof Address, "province">, label: string, attrs: Opts) => input(address, setAddress, k, label, { maxLength: LIMITS.line, ...attrs });

  return (
    <form
      className="account__form"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const r = await saveDetailsAction({ ...contact, email }, address).catch(() => OFFLINE);
        setBusy(false);
        if ("ok" in r) return onDone(r.details);
        if ("error" in r) return setError(r.error);
        setErrors(r.errors);
        requestAnimationFrame(() => document.querySelector<HTMLElement>(".account__form [aria-invalid]")?.focus());
      }}
    >
      <fieldset className="account__set">
        <legend className="account__legend">You</legend>
        <div className="fields">
          {you("firstName", "First name", { autoComplete: "given-name" })}
          {you("lastName", "Surname", { autoComplete: "family-name" })}
          {you("phone", "Mobile number", { autoComplete: "tel-national", type: "tel", inputMode: "tel", placeholder: "076 491 2300", maxLength: 20 })}
        </div>
      </fieldset>
      <fieldset className="account__set">
        <legend className="account__legend">
          Delivery address <span>optional; leave it empty to remove it</span>
        </legend>
        <div className="fields">
          {where("street", "Street address", { autoComplete: "address-line1", wide: true })}
          {where("suburb", "Suburb or area", { autoComplete: "address-line2" })}
          {where("city", "Town or city", { autoComplete: "address-level2" })}
          <Field id="ac-province" label="Province" error={errors.province}>
            <select
              id="ac-province"
              name="ac-province"
              className="field__input field__select"
              autoComplete="address-level1"
              aria-invalid={errors.province ? true : undefined}
              aria-describedby={errors.province ? "ac-province-error" : undefined}
              value={address.province}
              onChange={(e) => setAddress({ ...address, province: e.target.value as Address["province"] })}
            >
              <option value="">Choose…</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          {where("code", "Postal code", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 4, clean: (v) => v.replace(/\D/g, "") })}
          {where("notes", "For the driver", { autoComplete: "off", placeholder: "Unit number, complex name, gate code…", maxLength: LIMITS.notes, wide: true })}
        </div>
      </fieldset>
      {error ? <Note error>{error}</Note> : null}
      <p className="acct__acts">
        <button type="submit" className="btn btn--blue" aria-disabled={busy || undefined}>
          {busy ? "Saving…" : "Save details"}
        </button>
        <button type="button" className="inline-link" onClick={onCancel}>
          Cancel
        </button>
      </p>
    </form>
  );
}

/* ---- Emails from the shop -------------------------------------------------- */

/**
 * The one marketing choice, saved the moment it is switched. Order emails
 * aren't marketing and always come.
 */
export function MarketingSwitch({ on: initial }: { on: boolean }) {
  const id = useId();
  const [on, setOn] = useState(initial);
  const [said, setSaid] = useState<Said>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="optin">
      <div className="optin__row">
        <div>
          <p className="optin__label" id={`${id}-label`}>
            Specials and campaigns
          </p>
          <p className="receipt__soft" id={`${id}-desc`}>
            Hear when the shop runs a special or a seasonal campaign. Emails about your orders always come, whatever you choose.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={on}
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-desc`}
          aria-disabled={busy || undefined}
          onClick={async () => {
            if (busy) return;
            const next = !on;
            setOn(next);
            setBusy(true);
            const r = await setMarketingAction(next).catch(() => OFFLINE);
            setBusy(false);
            if ("error" in r) {
              setOn(!next);
              setSaid({ text: r.error, error: true });
            } else setSaid({ text: next ? "You’re on the list. You can switch this off at any time." : "Switched off. We won’t send you specials or campaigns." });
          }}
        >
          <span className="switch__knob" />
        </button>
      </div>
      {said ? <Note error={said.error}>{said.text}</Note> : null}
    </div>
  );
}

/* ---- Sign-in and account ------------------------------------------------- */

/** A setting's row: its name and a line under it, and one action that opens its form in place. */
function SettingRow({ label, about, action, form }: { label: string; about: ReactNode; action: string; form: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  if (open) return form(() => setOpen(false));
  return (
    <div className="arow">
      <div>
        <p className="arow__label">{label}</p>
        {about}
      </div>
      <button type="button" className="pillbtn" onClick={() => setOpen(true)}>
        {action}
      </button>
    </div>
  );
}

export function PasswordPanel({ email }: { email: string }) {
  const [changed, setChanged] = useState(false);
  return (
    <SettingRow
      label="Password"
      action="Change password"
      about={changed ? <Note>Changed. Any other phone or computer signed in to your account has been signed out.</Note> : <p className="receipt__soft">Signs you in with {email}.</p>}
      form={(close) => (
        <PasswordForm
          email={email}
          onCancel={close}
          onDone={() => {
            setChanged(true);
            close();
          }}
        />
      )}
    />
  );
}

function PasswordForm({ email, onDone, onCancel }: { email: string; onDone: () => void; onCancel: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [state, setState] = useState<{ error: string; field?: "current" | "next" } | null>(null);
  const [busy, setBusy] = useState(false);
  const errOf = (f: "current" | "next") => (state?.field === f ? state.error : undefined);

  return (
    <form
      className="account__form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const r = await changePasswordAction(current, next).catch(() => OFFLINE);
        setBusy(false);
        if ("ok" in r) onDone();
        else setState(r);
      }}
    >
      <p className="arow__label">Change your password</p>
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="fields">
        <Field id="ac-current" label="Current password" error={errOf("current")}>
          <input {...inputProps("ac-current", errOf("current"))} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
        </Field>
        <NewPasswordField id="ac-next" label="New password" value={next} error={errOf("next")} onChange={setNext} />
      </div>
      {state && !state.field ? <Note error>{state.error}</Note> : null}
      <p className="acct__acts">
        <button type="submit" className="btn btn--blue" aria-disabled={busy || undefined}>
          {busy ? "Changing…" : "Change password"}
        </button>
        <button type="button" className="inline-link" onClick={onCancel}>
          Cancel
        </button>
      </p>
    </form>
  );
}

/**
 * Deleting the account: what goes, what the shop must keep, and the password
 * to confirm. While an order is still on its way it says so instead, in the
 * words the server would refuse with.
 */
export function DeletePanel({ email, waiting }: { email: string; waiting: string[] }) {
  return (
    <SettingRow
      label="Delete your account"
      action="Delete account"
      about={<p className="receipt__soft">Removes your saved details and your photos from the shop’s records.</p>}
      form={(close) => <DeleteForm email={email} waiting={waiting} onCancel={close} />}
    />
  );
}

function DeleteForm({ email, waiting, onCancel }: { email: string; waiting: string[]; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const what = (
    <>
      <p className="arow__label">Delete your account for good?</p>
      <ul className="adelete__list">
        <li>
          <strong>Deleted:</strong> your sign-in, your saved details, your choice about emails, and the photos from every order you’ve placed with this account.
        </li>
        <li>
          <strong>Kept:</strong> the orders themselves (what was bought, when and for how much), which the shop must keep as its sales records. They stay with the shop, no longer linked to you.
        </li>
        <li>The receipt links in your order emails keep working.</li>
      </ul>
    </>
  );

  if (waiting.length > 0) {
    return (
      <div className="account__form">
        {what}
        <Note error>{stillOnTheWay(waiting)}</Note>
        <p className="acct__acts">
          <button type="button" className="inline-link" onClick={onCancel}>
            Close
          </button>
        </p>
      </div>
    );
  }

  return (
    <form
      className="account__form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        // Success leaves the page; only a refusal comes back.
        const r = await deleteAccountAction(password).catch(() => OFFLINE);
        setBusy(false);
        setError(r.error);
      }}
    >
      {what}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="fields">
        <Field id="ac-delete" label="Your password, to confirm" error={error ?? undefined}>
          <input {...inputProps("ac-delete", error ?? undefined)} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
      </div>
      <p className="acct__acts">
        <button type="submit" className="btn btn--blue" aria-disabled={busy || undefined}>
          {busy ? "Deleting…" : "Delete my account"}
        </button>
        <button type="button" className="inline-link" onClick={onCancel}>
          Keep my account
        </button>
      </p>
    </form>
  );
}

/* ---- Orders from before the account -------------------------------------- */

/** Until the email is proved: the offer to bring in orders placed with it before the account. */
export function FindOrders({ email }: { email: string }) {
  const [state, setState] = useState<AccountState>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="afind">
      <Mail size={22} className="afind__mark" />
      <div className="afind__body">
        <p className="arow__label">Ordered before you had an account?</p>
        <p className="receipt__soft">
          We&rsquo;ll email {email} a link. Tap it and any orders placed with that email join this list, with their receipts and tracking.
        </p>
        {state ? <Note error={!!state.error}>{state.error ?? state.notice}</Note> : null}
        {state?.notice ? null : (
          <button
            type="button"
            className="pillbtn"
            aria-disabled={busy || undefined}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              setState(await requestOrderCheck().catch(() => OFFLINE));
              setBusy(false);
            }}
          >
            {busy ? "Sending…" : "Email me the link"}
          </button>
        )}
      </div>
    </div>
  );
}
