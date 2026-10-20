"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { cartSubtotal, cartUnits, liveLines } from "@/lib/catalog/cart";
import type { Needs } from "@/lib/catalog/checkout";
import { rands } from "@/lib/catalog/listing";
import {
  addressErrors,
  contactErrors,
  EMPTY_ADDRESS,
  EMPTY_CONTACT,
  hasErrors,
  LIMITS,
  passwordError,
  PROVINCES,
  type Address,
  type Contact,
} from "@/lib/checkout/details";
import { MIN_PAYMENT, type DeliveryOption, type OrderInput, type Quote } from "@/lib/checkout/order";
import type { SavedDetails } from "@/lib/account/auth";
import { cart, useCart } from "@/app/site/cartStore";
import { HOURS, SHOP } from "@/app/site/data";
import { Alert, ArrowRight, Check, Parcel, Pin } from "@/app/site/icons";
import { signInForCheckout, signOutAction } from "@/app/account/actions";
import { CheckoutHead } from "../Head";
import { problems, progress, rowsFor, useHydrated } from "../model";
import { orderLines } from "../order";
import { usePhotos } from "../photoStore";
import { placeOrder, quoteDelivery } from "./actions";
import { Field, inputProps, NewPasswordField } from "../Field";
import { pay } from "./pay";
import { Review } from "./Review";

/** What this device remembers between visits: a convenience, never the order itself. */
const DRAFT_KEY = "epg:details:v1";
type Draft = { contact: Contact; address: Address; method: "collect" | "courier" };

function readDraft(): Partial<Draft> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

/** Each field from the draft, or failing that from the account. */
const merge = <T extends object>(base: T, ...from: (Partial<T> | null | undefined)[]): T =>
  Object.fromEntries(
    Object.keys(base).map((k) => [k, from.map((f) => f?.[k as keyof T]).find((v) => typeof v === "string" && v !== "") ?? base[k as keyof T]]),
  ) as T;

/** The fields in the order they are read, so the first one wrong is the one focused. */
const FIELD_ORDER = ["firstName", "lastName", "email", "password", "phone", "street", "suburb", "city", "province", "code", "notes"] as const;

const CANCELLED = "Payment cancelled. Nothing was charged, and your order is just as you left it.";

type QuoteState = { key: string; status: "loading" } | { key: string; status: "done"; quote: Quote };

/**
 * Checkout's last step, on one page: who it's for, collection or courier, the
 * order once more with its photos, then payment by PayFast. The slip beside
 * it (at the foot of the screen on a phone) carries the total and the one
 * action, and says what still stands in the way.
 */
type Props = {
  needs: Needs;
  account: { email: string; saved: SavedDetails | null } | null;
  courier: boolean;
  payments: boolean;
  onsite: boolean;
  /** Payments go to PayFast's sandbox: said beside the Pay button, so nobody mistakes a test for a sale. */
  sandbox: boolean;
  cancelled: boolean;
};

export function DetailsStep(props: Props) {
  return useHydrated() ? <Details {...props} /> : <CheckoutHead step="details" title="Your details" />;
}

function Details({ needs, account: initialAccount, courier, payments, onsite, sandbox, cancelled }: Props) {
  const router = useRouter();
  const { lines, prices } = useCart();
  const store = usePhotos();

  // The draft on this device fills the form first, then the account's saved details.
  const [draft] = useState(readDraft);
  const [account, setAccount] = useState(initialAccount);
  const [contact, setContact] = useState<Contact>(() =>
    merge(EMPTY_CONTACT, draft.contact, initialAccount?.saved?.contact, initialAccount ? { email: initialAccount.email } : null),
  );
  const [address, setAddress] = useState<Address>(() => merge(EMPTY_ADDRESS, draft.address, initialAccount?.saved?.address));
  const [method, setMethod] = useState<"collect" | "courier">(draft.method === "courier" && courier ? "courier" : "collect");
  const [service, setService] = useState<string | null>(null);
  const [quoted, setQuoted] = useState<QuoteState | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(cancelled ? CANCELLED : null);
  const [paidAlready, setPaidAlready] = useState(false);
  // "Save my details": an account made as they pay. The password is never kept on this device.
  const [saveAccount, setSaveAccount] = useState(false);
  const [password, setPassword] = useState("");
  // The server's word on the account, for the email and password it was given; it lapses when either changes.
  const [refused, setRefused] = useState<{ error: string; email: string; password: string } | null>(null);
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ contact, address, method } satisfies Draft));
    } catch {
      // Private mode: the form still works for this visit.
    }
  }, [contact, address, method]);

  useEffect(() => {
    cart.checkPrices();
  }, []);

  const live = useMemo(() => liveLines(lines, prices), [lines, prices]);
  const rows = useMemo(() => rowsFor(live, needs, store.lines), [live, needs, store.lines]);
  const prog = useMemo(() => progress(rows, store.photos, store.bakes), [rows, store.photos, store.bakes]);
  const photoIssues = problems(prog);
  const takesPhotos = rows.some((r) => r.needs?.photo);
  const subtotal = cartSubtotal(live);

  const cErrors = contactErrors(contact);
  const aErrors = addressErrors(address);
  const addressDone = !hasErrors(aErrors);
  const makingAccount = saveAccount && !account;

  // A courier price for the address as typed, once it is complete; asked again when the cart changes.
  const quoteKey = JSON.stringify([address, live.map((l) => [l.sku, l.quantity])]);
  useEffect(() => {
    if (method !== "courier" || !courier || !addressDone) return;
    if (quoted?.key === quoteKey) return;
    const timer = setTimeout(async () => {
      setQuoted({ key: quoteKey, status: "loading" });
      const q = await quoteDelivery(address, live.map((l) => ({ sku: l.sku, quantity: l.quantity }))).catch(
        (): Quote => ({ ok: false, reason: "unavailable" }),
      );
      setQuoted((now) => (now?.key === quoteKey ? { key: quoteKey, status: "done", quote: q } : now));
    }, 600);
    return () => clearTimeout(timer);
  }, [method, courier, addressDone, quoteKey, quoted?.key, address, live]);

  const current = quoted?.key === quoteKey ? quoted : null;
  const options: DeliveryOption[] = current?.status === "done" && current.quote.ok ? current.quote.options : [];
  const chosen = options.find((o) => o.code === service) ?? options[0] ?? null;
  const delivery = method === "collect" ? 0 : chosen?.price ?? null;
  const total = delivery === null ? null : subtotal + delivery;

  /** What stands between the customer and paying, that the form's own errors don't cover. */
  const blockers: { text: string; href?: string }[] = [];
  if (photoIssues.length > 0) blockers.push({ text: photoIssues[0].text, href: "/checkout" });
  if (method === "courier") {
    if (!addressDone) blockers.push({ text: "Add your delivery address for a price" });
    else if (!current || current.status === "loading") blockers.push({ text: "Getting delivery prices…" });
    else if (!current.quote.ok) blockers.push({ text: "No delivery price for this address" });
  }
  if (total !== null && total < MIN_PAYMENT) blockers.push({ text: `Orders paid online start at ${rands(MIN_PAYMENT)}`, href: "/shop" });
  if (!payments) blockers.push({ text: "Online payment isn’t switched on yet" });

  const show = (field: string) => tried || touched.has(field);
  const touch = (field: string) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));
  const cErr = (k: keyof Contact) => (show(k) ? cErrors[k] : undefined);
  const aErr = (k: keyof Address) => (show(k) ? aErrors[k] : undefined);
  const stillRefused = refused && refused.email === contact.email && refused.password === password ? refused.error : undefined;
  const pErrors = makingAccount ? { password: passwordError(password) ?? stillRefused } : {};
  const pErr = show("password") ? pErrors.password : undefined;
  const errors = { ...cErrors, ...(method === "courier" ? aErrors : {}), ...pErrors };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError(null);
    setNotice(null);
    const bad = FIELD_ORDER.find((k) => errors[k]);
    if (bad) {
      document.getElementById(bad)?.focus();
      return;
    }
    if (blockers.length > 0 || total === null || busy) return;

    setBusy(true);
    const input: OrderInput = {
      ref: store.ref,
      key: store.key,
      contact,
      fulfilment: method === "courier" && chosen ? { method: "courier", address, service: chosen.code } : { method: "collect" },
      lines: orderLines(rows, store.photos, store.bakes),
      shownTotal: total,
    };
    const placed = await placeOrder(input, onsite && window.location.protocol === "https:", makingAccount ? password : undefined).catch(() => null);
    if (!placed) {
      setBusy(false);
      setError("We couldn’t reach the shop’s server. Check your connection and try again.");
      return;
    }
    if (!placed.ok) {
      setBusy(false);
      setError(placed.error);
      if (placed.paid) setPaidAlready(true);
      if (placed.field === "total") {
        cart.checkPrices(true);
        setQuoted(null);
      }
      if (placed.field === "delivery") setQuoted(null);
      if (placed.field === "password") {
        setRefused({ error: placed.error, email: contact.email, password });
        document.getElementById("password")?.focus();
      }
      return;
    }
    // Their account is made and they're signed in; paying again won't make another.
    if (makingAccount) {
      setAccount({ email: contact.email.trim().toLowerCase(), saved: null });
      setPassword("");
    }
    const outcome = await pay(placed.checkout);
    if (outcome === "paid") {
      router.push(`/checkout/done?ref=${placed.ref}&t=${placed.token}`);
    } else {
      setBusy(false);
      setNotice(CANCELLED);
    }
  };

  if (live.length === 0) {
    return (
      <>
        <CheckoutHead step="details" title="Your details" />
        <div className="shell ck__empty">
          <p>Your cart is empty, so there&rsquo;s nothing to check out yet.</p>
          <Link className="btn btn--gold on-gold" href="/shop">
            Browse the shop
            <ArrowRight size={17} />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <CheckoutHead
        step="details"
        title="Your details"
        skipPhotos={!takesPhotos}
        lede="Who it’s for and how it reaches you. Then you pay securely with PayFast."
        aside={
          <p className="ckhead__ref">
            Order <strong>{store.ref}</strong>
          </p>
        }
      />

      <form className="shell ck__grid co" onSubmit={submit} noValidate>
        <div className="co__steps">
          {notice ? (
            <p className="co__notice" role="status">
              <Check size={20} />
              {notice}
            </p>
          ) : null}

          <section className="costep" aria-labelledby="co-you">
            <h2 id="co-you" className="costep__title">
              <span className="costep__n" aria-hidden="true">1</span>
              Contact
            </h2>
            <AccountBar
              account={account}
              onSignedIn={(email, details) => {
                setAccount({ email, saved: details });
                // What the customer has already typed stands; the account fills the gaps.
                setContact((c) => merge(EMPTY_CONTACT, c, details?.contact, { email }));
                if (details?.address) setAddress((a) => merge(EMPTY_ADDRESS, a, details.address));
              }}
              onSignedOut={() => setAccount(null)}
            />
            <div className="fields">
              <Field id="firstName" label="First name" error={cErr("firstName")}>
                <input
                  {...inputProps("firstName", cErr("firstName"))}
                  autoComplete="given-name"
                  maxLength={LIMITS.name}
                  value={contact.firstName}
                  onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                  onBlur={() => touch("firstName")}
                />
              </Field>
              <Field id="lastName" label="Surname" error={cErr("lastName")}>
                <input
                  {...inputProps("lastName", cErr("lastName"))}
                  autoComplete="family-name"
                  maxLength={LIMITS.name}
                  value={contact.lastName}
                  onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                  onBlur={() => touch("lastName")}
                />
              </Field>
              <Field id="email" label="Email" hint="for your receipt" error={cErr("email")}>
                <input
                  {...inputProps("email", cErr("email"))}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={LIMITS.email}
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  onBlur={() => touch("email")}
                />
              </Field>
              {makingAccount ? (
                <NewPasswordField
                  id="password"
                  label="Create a password"
                  value={password}
                  error={pErr}
                  onChange={setPassword}
                  onBlur={() => touch("password")}
                />
              ) : null}
              <Field id="phone" label="Mobile number" hint="so we can reach you" error={cErr("phone")}>
                <input
                  {...inputProps("phone", cErr("phone"))}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="076 491 2300"
                  maxLength={20}
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  onBlur={() => touch("phone")}
                />
              </Field>
            </div>
            {account ? null : (
              <label className="check">
                <input
                  type="checkbox"
                  checked={saveAccount}
                  onChange={(e) => {
                    setSaveAccount(e.target.checked);
                    // Straight to the new field, so ticking reads as the start of a task.
                    if (e.target.checked) requestAnimationFrame(() => document.getElementById("password")?.focus());
                  }}
                />
                Save my details for next time
              </label>
            )}
          </section>

          <section className="costep" aria-labelledby="co-way">
            <h2 id="co-way" className="costep__title">
              <span className="costep__n" aria-hidden="true">2</span>
              Collect or deliver
            </h2>
            <fieldset className="ways">
              <legend className="visually-hidden">How your order reaches you</legend>
              <label className="way" data-on={method === "collect" || undefined}>
                <input type="radio" name="method" value="collect" checked={method === "collect"} onChange={() => setMethod("collect")} />
                <span className="way__head">
                  <Pin size={22} />
                  <span className="way__name">Collect from the shop</span>
                  <span className="way__price">Free</span>
                </span>
                <span className="way__body">
                  {SHOP.street}, {SHOP.town}. Bring your order number, {store.ref}.
                </span>
                <span className="way__hours">
                  {HOURS.map((h) => (
                    <span key={h.days}>
                      {h.days} <b>{h.time}</b>
                    </span>
                  ))}
                </span>
              </label>
              <label className="way" data-on={method === "courier" || undefined} data-off={!courier || undefined}>
                <input
                  type="radio"
                  name="method"
                  value="courier"
                  disabled={!courier}
                  checked={method === "courier"}
                  onChange={() => setMethod("courier")}
                />
                <span className="way__head">
                  <Parcel size={22} />
                  <span className="way__name">The Courier Guy to your door</span>
                  <span className="way__price">
                    {!courier ? "Soon" : method === "courier" && chosen ? rands(chosen.price) : "Priced by address"}
                  </span>
                </span>
                <span className="way__body">
                  {courier
                    ? "Anywhere in South Africa. The price comes from the courier once your address is in."
                    : "Courier delivery isn’t open online yet. For now, collect from the shop."}
                </span>
              </label>
            </fieldset>

            {method === "courier" ? (
              <div className="deliver">
                <div className="fields">
                  <Field id="street" label="Street address" wide error={aErr("street")}>
                    <input
                      {...inputProps("street", aErr("street"))}
                      autoComplete="address-line1"
                      maxLength={LIMITS.line}
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      onBlur={() => touch("street")}
                    />
                  </Field>
                  <Field id="suburb" label="Suburb or area" error={aErr("suburb")}>
                    <input
                      {...inputProps("suburb", aErr("suburb"))}
                      autoComplete="address-line2"
                      maxLength={LIMITS.line}
                      value={address.suburb}
                      onChange={(e) => setAddress({ ...address, suburb: e.target.value })}
                      onBlur={() => touch("suburb")}
                    />
                  </Field>
                  <Field id="city" label="Town or city" error={aErr("city")}>
                    <input
                      {...inputProps("city", aErr("city"))}
                      autoComplete="address-level2"
                      maxLength={LIMITS.line}
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      onBlur={() => touch("city")}
                    />
                  </Field>
                  <Field id="province" label="Province" error={aErr("province")}>
                    <select
                      id="province"
                      name="province"
                      className="field__input field__select"
                      autoComplete="address-level1"
                      aria-invalid={aErr("province") ? true : undefined}
                      aria-describedby={aErr("province") ? "province-error" : undefined}
                      value={address.province}
                      onChange={(e) => setAddress({ ...address, province: e.target.value as Address["province"] })}
                      onBlur={() => touch("province")}
                    >
                      <option value="">Choose…</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="code" label="Postal code" error={aErr("code")}>
                    <input
                      {...inputProps("code", aErr("code"))}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={4}
                      value={address.code}
                      onChange={(e) => setAddress({ ...address, code: e.target.value.replace(/\D/g, "") })}
                      onBlur={() => touch("code")}
                    />
                  </Field>
                  <Field id="notes" label="For the driver" hint="optional" wide error={aErr("notes")}>
                    <input
                      {...inputProps("notes", aErr("notes"))}
                      placeholder="Unit number, complex name, gate code…"
                      maxLength={LIMITS.notes}
                      value={address.notes}
                      onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                    />
                  </Field>
                </div>

                <Services
                  addressDone={addressDone}
                  state={current}
                  chosen={chosen}
                  onChoose={setService}
                  onRetry={() => setQuoted(null)}
                  onCollect={() => setMethod("collect")}
                />
              </div>
            ) : null}
          </section>

          <section className="costep" aria-labelledby="co-check">
            <h2 id="co-check" className="costep__title">
              <span className="costep__n" aria-hidden="true">3</span>
              Check your order
            </h2>
            <Review rows={rows} photos={store.photos} />
          </section>
        </div>

        <aside className="coslip" aria-label="Your order">
          <div className="coslip__lines">
            <p className="coslip__title">
              Your order <span className="coslip__n">{cartUnits(live)}</span>
            </p>
            <ul>
              {live.map((l) => (
                <li key={l.sku}>
                  <span>
                    {l.quantity} × {l.name}
                  </span>
                  <span>{rands(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
          <dl className="coslip__sums">
            <div>
              <dt>Subtotal</dt>
              <dd>{rands(subtotal)}</dd>
            </div>
            <div>
              <dt>{method === "collect" ? "Collect from the shop" : chosen ? `Delivery, ${chosen.name}` : "Delivery"}</dt>
              <dd>{delivery === null ? "—" : delivery === 0 ? "Free" : rands(delivery)}</dd>
            </div>
          </dl>
          <p className="slip__total coslip__total">
            <span>Total</span>
            <strong aria-live="polite">{total === null ? "—" : rands(total)}</strong>
          </p>

          {error ? (
            <p className="coslip__error" role="alert">
              <Alert size={19} />
              {error}
            </p>
          ) : null}
          {paidAlready ? (
            <p className="coslip__note">
              Your receipt from PayFast is in your email. <Link className="inline-link" href="/shop">Back to the shop</Link>
            </p>
          ) : null}

          {blockers.length > 0 ? (
            <ul className="coslip__problems">
              {blockers.map((b) => (
                <li key={b.text}>{b.href ? <Link className="inline-link" href={b.href}>{b.text}</Link> : b.text}</li>
              ))}
            </ul>
          ) : null}

          <button
            type="submit"
            className="btn btn--gold on-gold coslip__pay"
            aria-disabled={blockers.length > 0 || busy || undefined}
            aria-describedby="coslip-note"
          >
            {busy ? "Opening PayFast…" : total === null ? "Pay" : `Pay ${rands(total)}`}
            {busy ? null : <ArrowRight size={19} />}
          </button>
          <p id="coslip-note" className="coslip__note">
            Secure payment by PayFast. The shop starts on your order once it&rsquo;s paid.
          </p>
          {sandbox ? <p className="coslip__note">Sandbox mode enabled</p> : null}
        </aside>
      </form>

    </>
  );
}

/** The courier's services for the address, as radio rows, or why there are none. */
function Services({
  addressDone,
  state,
  chosen,
  onChoose,
  onRetry,
  onCollect,
}: {
  addressDone: boolean;
  state: QuoteState | null;
  chosen: DeliveryOption | null;
  onChoose: (code: string) => void;
  onRetry: () => void;
  onCollect: () => void;
}) {
  if (!addressDone) return <p className="services__wait">Fill in the address and the courier&rsquo;s prices appear here.</p>;
  if (!state || state.status === "loading") {
    return (
      <p className="services__wait" role="status">
        <span className="services__spin" aria-hidden="true" />
        Getting prices from The Courier Guy…
      </p>
    );
  }
  if (!state.quote.ok) {
    const reason = state.quote.reason;
    return (
      <div className="services__none" role="alert">
        <p>
          <Alert size={19} />
          {reason === "no-service"
            ? "The courier doesn’t have a price for this address. Check the suburb and postal code."
            : reason === "not-set-up"
              ? "Courier delivery isn’t open online yet."
              : "We couldn’t reach The Courier Guy just now."}
        </p>
        <p className="services__acts">
          {reason === "unavailable" ? (
            <button type="button" className="inline-link" onClick={onRetry}>
              Try again
            </button>
          ) : null}
          <button type="button" className="inline-link" onClick={onCollect}>
            Collect from the shop instead
          </button>
        </p>
      </div>
    );
  }
  return (
    <fieldset className="services">
      <legend className="pills__legend">Delivery option</legend>
      {state.quote.options.map((o) => (
        <label key={o.code} className="service" data-on={chosen?.code === o.code || undefined}>
          <input type="radio" name="service" value={o.code} checked={chosen?.code === o.code} onChange={() => onChoose(o.code)} />
          <span className="service__name">
            {o.name}
            {o.description ? <span>{o.description}</span> : null}
          </span>
          <span className="service__price">{rands(o.price)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Signed in, a line to say so; signed out, a quiet offer to sign in that opens in place. */
function AccountBar({
  account,
  onSignedIn,
  onSignedOut,
}: {
  account: { email: string } | null;
  onSignedIn: (email: string, details: SavedDetails | null) => void;
  onSignedOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (account) {
    return (
      <p className="acct">
        Signed in as <strong>{account.email}</strong>.{" "}
        <button
          type="button"
          className="inline-link"
          onClick={async () => {
            await signOutAction();
            onSignedOut();
          }}
        >
          Sign out
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <p className="acct">
        Saved your details with us before?{" "}
        <button type="button" className="inline-link" onClick={() => setOpen(true)}>
          Sign in
        </button>
      </p>
    );
  }

  const go = async () => {
    setBusy(true);
    setError(null);
    const r = await signInForCheckout(email, password).catch(() => ({ error: "Signing in didn’t work. Check your connection." }));
    setBusy(false);
    if ("error" in r) setError(r.error);
    else onSignedIn(r.email, r.details);
  };

  // Not a nested form: the page is one form, so Enter here signs in rather than paying.
  return (
    <div
      className="acct acct--open"
      role="group"
      aria-label="Sign in"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          go();
        }
      }}
    >
      <div className="fields">
        <Field id="acct-email" label="Email">
          <input
            {...inputProps("acct-email", undefined)}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field id="acct-password" label="Password">
          <input
            {...inputProps("acct-password", undefined)}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </div>
      {error ? (
        <p className="field__error" role="alert">
          <Alert size={18} />
          {error}
        </p>
      ) : null}
      <p className="acct__acts">
        <button type="button" className="btn btn--blue" onClick={go} aria-disabled={busy || undefined}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <Link className="inline-link" href="/account">
          Forgot your password?
        </Link>
        <button type="button" className="inline-link" onClick={() => setOpen(false)}>
          Not now
        </button>
      </p>
    </div>
  );
}
