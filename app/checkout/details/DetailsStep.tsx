"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { cartSavings } from "@/lib/catalog/campaigns";
import { cartUnits } from "@/lib/catalog/cart";
import type { Needs } from "@/lib/catalog/checkout";
import { rands, signedRands } from "@/lib/catalog/listing";
import {
  addressErrors,
  contactErrors,
  EMPTY_ADDRESS,
  EMPTY_CONTACT,
  EMPTY_RECIPIENT,
  hasErrors,
  LIMITS,
  passwordError,
  PROVINCES,
  recipientErrors,
  type Address,
  type Contact,
  type Recipient,
} from "@/lib/checkout/details";
import { MIN_PAYMENT, receiptPath, type DeliveryOption, type OrderInput, type Quote } from "@/lib/checkout/order";
import type { SavedDetails } from "@/lib/account/auth";
import { POLICIES_VERSION, policyTitle, type PolicyPath } from "@/lib/legal";
import { cart, useCart, usePricedCart } from "@/app/site/cartStore";
import { HOURS, SHOP } from "@/app/site/data";
import { Alert, ArrowRight, Parcel, Pin } from "@/app/site/icons";
import { track } from "@/app/site/track";
import { signInForCheckout, signOutAction } from "@/app/account/actions";
import { clearDraft, DRAFT_KEY, paidReceipt, rememberPaid, useDockHeight } from "../draft";
import { CheckoutHead } from "../Head";
import { problems, progress, rowsFor, useHydrated } from "../model";
import { orderLines } from "../order";
import { usePhotos } from "../photoStore";
import { placeOrder, quoteDelivery, reportPaidAction } from "./actions";
import { CodeBox } from "./CodeBox";
import { Field, inputProps, NewPasswordField } from "../Field";
import { pay } from "./pay";
import { Review } from "./Review";

/** What this device remembers between visits (`DRAFT_KEY`): a convenience, never the order itself. */
type Draft = { contact: Contact; address: Address; method: "collect" | "courier"; toSomeone: boolean; recipient: Recipient };

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
const FIELD_ORDER = ["firstName", "lastName", "email", "password", "phone", "recipientName", "recipientPhone", "street", "suburb", "city", "province", "code", "notes"] as const;

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
  /** Delivery is priced and booked in TCG's sandbox: said above the delivery options. */
  courierSandbox: boolean;
  cancelled: boolean;
};

export function DetailsStep(props: Props) {
  return useHydrated() ? <Details {...props} /> : <CheckoutHead step="details" title="Your details" />;
}

function Details({ needs, account: initialAccount, courier, payments, onsite, sandbox, courierSandbox, cancelled }: Props) {
  const router = useRouter();
  // The lines the shop can sell, priced with the live campaigns as the server will price them.
  const { live, priced, unit } = usePricedCart();
  const { code } = useCart();
  const store = usePhotos();

  // The draft on this device fills the form first, then the account's saved details.
  const [draft] = useState(readDraft);
  const [account, setAccount] = useState(initialAccount);
  const [contact, setContact] = useState<Contact>(() =>
    merge(EMPTY_CONTACT, draft.contact, initialAccount?.saved?.contact, initialAccount ? { email: initialAccount.email } : null),
  );
  const [address, setAddress] = useState<Address>(() => merge(EMPTY_ADDRESS, draft.address, initialAccount?.saved?.address));
  const [method, setMethod] = useState<"collect" | "courier">(draft.method === "courier" && courier ? "courier" : "collect");
  const [toSomeone, setToSomeone] = useState(draft.toSomeone === true);
  const [recipient, setRecipient] = useState<Recipient>(() => merge(EMPTY_RECIPIENT, draft.recipient));
  const [service, setService] = useState<string | null>(null);
  const [insure, setInsure] = useState(false);
  // Agreeing to the terms, asked afresh on every visit: never remembered on the device.
  const [agreed, setAgreed] = useState(false);
  const [quoted, setQuoted] = useState<QuoteState | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(cancelled ? CANCELLED : null);
  const [paidAlready, setPaidAlready] = useState(false);
  // "Save my details": an account made as they pay. The password is never kept on this device.
  const [saveAccount, setSaveAccount] = useState(false);
  // The slip's breakdown, docked on a phone: closed until asked for.
  const [breakdown, setBreakdown] = useState(false);
  const [password, setPassword] = useState("");
  // The server's word on the account, for the email and password it was given; it lapses when either changes.
  const slipRef = useRef<HTMLElement>(null);
  const problemsRef = useRef<HTMLUListElement>(null);
  useDockHeight(slipRef);
  const [refused, setRefused] = useState<{ error: string; email: string; password: string } | null>(null);
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ contact, address, method, toSomeone, recipient } satisfies Draft));
    } catch {
      // Private mode: the form still works for this visit.
    }
  }, [contact, address, method, toSomeone, recipient]);

  useEffect(() => {
    cart.checkPrices();
  }, []);

  // Back here after PayFast's window said this order was paid: its receipt, not a second payment.
  useEffect(() => {
    const receipt = store.ref ? paidReceipt(store.ref) : null;
    if (receipt) router.replace(receipt);
  }, [store.ref, router]);

  const reached = live.length > 0;
  useEffect(() => {
    if (reached) track({ step: "details" });
  }, [reached]);

  const rows = useMemo(() => rowsFor(live, needs, store.lines), [live, needs, store.lines]);
  const prog = useMemo(() => progress(rows, store.photos, store.bakes), [rows, store.photos, store.bakes]);
  const photoIssues = problems(prog);
  const takesPhotos = rows.some((r) => r.needs?.photo);
  const savings = cartSavings(priced);
  // What the code's campaign takes off this cart, at every stage: 0 when nothing in the cart is part of its deal.
  const codeSaved = code ? priced.savings.filter((s) => s.campaign === code.deal.id).reduce((n, s) => n + s.amount, 0) : 0;

  const cErrors = contactErrors(contact);
  const aErrors = addressErrors(address);
  const addressDone = !hasErrors(aErrors);
  const makingAccount = saveAccount && !account;

  // A courier price for the address as typed, once it is complete; asked again when the cart changes. The driver's note doesn't change the price.
  const quoteKey = JSON.stringify([address.street, address.suburb, address.city, address.province, address.code, live.map((l) => [l.sku, l.quantity]), code?.code ?? null]);
  useEffect(() => {
    if (method !== "courier" || !courier || !addressDone) return;
    if (quoted?.key === quoteKey) return;
    const timer = setTimeout(async () => {
      setQuoted({ key: quoteKey, status: "loading" });
      const q = await quoteDelivery(address, live.map((l) => ({ sku: l.sku, quantity: l.quantity })), code?.code).catch(
        (): Quote => ({ ok: false, reason: "unavailable" }),
      );
      setQuoted((now) => (now?.key === quoteKey ? { key: quoteKey, status: "done", quote: q } : now));
    }, 600);
    return () => clearTimeout(timer);
  }, [method, courier, addressDone, quoteKey, quoted?.key, address, live, code?.code]);

  const current = quoted?.key === quoteKey ? quoted : null;
  const options: DeliveryOption[] = current?.status === "done" && current.quote.ok ? current.quote.options : [];
  const chosen = options.find((o) => o.code === service) ?? options[0] ?? null;
  // The full value insured only where it costs more than the free cover, and only when the customer ticks it.
  const insured = insure && chosen?.full ? chosen.full : null;
  const delivery = method === "collect" ? 0 : chosen ? (insured ?? chosen).price : null;
  const shown = delivery === null ? null : priced.total + delivery;
  // The server's total for exactly this order, once it has said it differs: what is shown and paid, until the order changes.
  const [checked, setChecked] = useState<{ key: string; total: number } | null>(null);
  const orderKey = JSON.stringify([quoteKey, method, chosen?.code ?? null, insured !== null]);
  const confirmed = checked?.key === orderKey && shown !== null && checked.total !== shown ? checked.total : null;
  const total = confirmed ?? shown;

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
  if (!agreed) blockers.push({ text: "Tick to agree to our terms", href: "#co-agree" });

  const show = (field: string) => tried || touched.has(field);
  const touch = (field: string) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));
  const cErr = (k: keyof Contact) => (show(k) ? cErrors[k] : undefined);
  const aErr = (k: keyof Address) => (show(k) ? aErrors[k] : undefined);
  const sending = method === "courier" && toSomeone;
  const rRaw = recipientErrors(recipient);
  const rErrors = sending ? { recipientName: rRaw.name, recipientPhone: rRaw.phone } : {};
  const rErr = (k: keyof typeof rErrors) => (show(k) ? rErrors[k] : undefined);
  const stillRefused = refused && refused.email === contact.email && refused.password === password ? refused.error : undefined;
  const pErrors = makingAccount ? { password: passwordError(password) ?? stillRefused } : {};
  const pErr = show("password") ? pErrors.password : undefined;
  const errors: Partial<Record<(typeof FIELD_ORDER)[number], string>> = { ...cErrors, ...(method === "courier" ? aErrors : {}), ...rErrors, ...pErrors };

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
    if (blockers.length > 0 || total === null || busy) {
      // Pay is only ever dimmed: pressing it says what stands in the way.
      problemsRef.current?.focus();
      return;
    }

    setBusy(true);
    const input: OrderInput = {
      ref: store.ref,
      key: store.key,
      contact,
      fulfilment:
        method === "courier" && chosen
          ? { method: "courier", address, recipient: sending ? recipient : null, service: chosen.code, insure: insured !== null }
          : { method: "collect" },
      lines: orderLines(rows, store.photos, store.bakes),
      shownTotal: total,
      code: code?.code ?? null,
      accepted: agreed ? POLICIES_VERSION : "",
    };
    const placed = await placeOrder(input, onsite && window.location.protocol === "https:", makingAccount ? password : undefined).catch(() => null);
    if (!placed) {
      setBusy(false);
      setError("We couldn’t reach the shop’s server. Check your connection and try again.");
      return;
    }
    if (!placed.ok && placed.receipt) return router.push(placed.receipt);
    if (!placed.ok) {
      setBusy(false);
      setError(placed.error);
      if (placed.paid) setPaidAlready(true);
      // The code can't be used (used since, or its offer ended): off the order, and the total the customer sees is without it.
      if (placed.field === "code") {
        cart.removeCode();
        setQuoted(null);
      }
      if (placed.field === "total") {
        if (placed.total !== undefined) setChecked({ key: orderKey, total: placed.total });
        cart.checkPrices(true);
        setQuoted(null);
      }
      if (placed.field === "delivery") setQuoted(null);
      // Stock ran short since the cart was filled: the cart opens on the lines, with the choice of what to do.
      if (placed.field === "stock" && placed.limits) cart.limit(placed.limits);
      if (placed.field === "recipient") document.getElementById("recipientName")?.focus();
      if (placed.field === "terms") document.getElementById("co-agree")?.focus();
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
      const receipt = receiptPath(placed.ref, placed.token);
      clearDraft();
      rememberPaid(placed.ref, receipt);
      // The server holds the order too, so no device can pay for it again before PayFast's notice; never held up by it.
      await Promise.race([reportPaidAction(placed.ref, placed.token).catch(() => undefined), new Promise((r) => setTimeout(r, 3000))]);
      router.push(receipt);
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
        orderRef={store.ref}
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
              <Alert size={20} />
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
              onSignedOut={() => {
                clearDraft();
                setAccount(null);
              }}
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
                  {SHOP.street}, {SHOP.town}. We email you when it&rsquo;s ready; bring your order number, {store.ref}.
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
                  <span className="way__name">The Courier Guy to the door</span>
                  <span className="way__price">
                    {!courier ? "Soon" : method === "courier" && chosen ? rands(chosen.price) : "Priced by address"}
                  </span>
                </span>
                <span className="way__body">
                  {courier
                    ? "Anywhere in South Africa, to you or straight to them. The price comes from the courier once the address is in, and we email you the tracking number once it’s on its way."
                    : "Courier delivery isn’t open online yet. For now, collect from the shop."}
                </span>
              </label>
            </fieldset>

            {method === "courier" ? (
              <div className="deliver">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={toSomeone}
                    onChange={(e) => {
                      setToSomeone(e.target.checked);
                      if (e.target.checked) requestAnimationFrame(() => document.getElementById("recipientName")?.focus());
                    }}
                  />
                  Send it straight to someone else
                </label>
                {toSomeone ? (
                  <div className="fields">
                    <Field id="recipientName" label="Their name" error={rErr("recipientName")}>
                      <input
                        {...inputProps("recipientName", rErr("recipientName"))}
                        autoComplete="off"
                        maxLength={LIMITS.name}
                        value={recipient.name}
                        onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                        onBlur={() => touch("recipientName")}
                      />
                    </Field>
                    <Field id="recipientPhone" label="Their mobile" hint="the courier SMSes them, so they’ll know a parcel is coming" error={rErr("recipientPhone")}>
                      <input
                        {...inputProps("recipientPhone", rErr("recipientPhone"))}
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        placeholder="082 123 4567"
                        maxLength={20}
                        value={recipient.phone}
                        onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
                        onBlur={() => touch("recipientPhone")}
                      />
                    </Field>
                  </div>
                ) : null}
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
                  sandbox={courierSandbox}
                />
                {chosen?.full ? (
                  <label className="check">
                    <input type="checkbox" checked={insure} onChange={(e) => setInsure(e.target.checked)} />
                    Insure the full {rands(chosen.full.cover)} for {rands(chosen.full.price - chosen.price)} more
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="costep" aria-labelledby="co-check">
            <h2 id="co-check" className="costep__title">
              <span className="costep__n" aria-hidden="true">3</span>
              Check your order
            </h2>
            <Review rows={rows} photos={store.photos} />
            <CodeBox applied={code} saved={codeSaved} />
            {/* The agreement, at the end of the review it covers. Its links open
                beside checkout, so reading them never loses the form. */}
            <label className="check coagree">
              <input id="co-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>
                I agree to the <Policy path="/terms" />, including its returns, cancellations and refunds and the notices marked with a gold dot that limit the
                shop&rsquo;s liability, and that I have the right to print the photos I&rsquo;ve added. The <Policy path="/privacy" /> says how my details are used.
              </span>
            </label>
          </section>
        </div>

        <aside ref={slipRef} className="coslip" aria-label="Your order" data-open={breakdown || undefined}>
          {/* Beside the form it is all shown; docked on a phone it opens from the total. */}
          <div id="coslip-breakdown" className="coslip__breakdown">
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
                  <span>{rands(unit(l) * l.quantity)}</span>
                </li>
              ))}
            </ul>
          </div>
          <dl className="coslip__sums">
            <div>
              <dt>Subtotal</dt>
              <dd>{rands(priced.subtotal)}</dd>
            </div>
            {savings.map((s) => (
              <div key={`${s.campaign}/${s.rule}`}>
                <dt>{s.label}</dt>
                <dd>{signedRands(-s.amount)}</dd>
              </div>
            ))}
            <div>
              <dt>{method === "collect" ? "Collect from the shop" : chosen ? `Delivery, ${chosen.name}${insured ? ", insured" : ""}` : "Delivery"}</dt>
              <dd>{delivery === null ? "—" : delivery === 0 ? "Free" : rands(delivery)}</dd>
            </div>
          </dl>
          </div>
          <p className="slip__total coslip__total">
            <span>
              Total
              <button
                type="button"
                className="inline-link coslip__more"
                aria-expanded={breakdown}
                aria-controls="coslip-breakdown"
                onClick={() => setBreakdown((o) => !o)}
              >
                {breakdown ? "Hide breakdown" : "See breakdown"}
              </button>
            </span>
            <strong aria-live="polite">{total === null ? "—" : rands(total)}</strong>
          </p>
          {confirmed !== null && shown !== null ? (
            <p className="coslip__note" role="status">
              Checked with the shop: the total is {rands(confirmed)}, not the {rands(shown)} worked out here. That’s what you’ll pay.
            </p>
          ) : null}

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
            <ul ref={problemsRef} id="coslip-problems" tabIndex={-1} className="coslip__problems">
              {blockers.map((b) => (
                <li key={b.text}>{b.href ? <Link className="inline-link" href={b.href}>{b.text}</Link> : b.text}</li>
              ))}
            </ul>
          ) : null}

          <button
            type="submit"
            className="btn btn--gold on-gold coslip__pay"
            aria-disabled={blockers.length > 0 || busy || undefined}
            aria-busy={busy || undefined}
            aria-describedby={blockers.length > 0 ? "coslip-problems coslip-note" : "coslip-note"}
          >
            {busy ? (
              <>
                Processing<span className="coslip__payMore"> payment</span>
              </>
            ) : total === null ? (
              "Pay"
            ) : (
              `Pay ${rands(total)}`
            )}
            {busy ? <span className="services__spin" aria-hidden="true" /> : <ArrowRight size={19} />}
          </button>
          <p id="coslip-note" className="coslip__note coslip__secure">
            Secure payment by PayFast.<span className="coslip__noteMore"> The shop starts on your order once it&rsquo;s paid.</span>
          </p>
          {sandbox ? <p className="coslip__note coslip__sandbox">Payment sandbox mode enabled</p> : null}
        </aside>
      </form>

    </>
  );
}

/** A policy named in the agreement, opened beside checkout so reading it never loses the form. */
const Policy = ({ path }: { path: PolicyPath }) => (
  <Link className="inline-link" href={path} target="_blank">
    {policyTitle(path)}
  </Link>
);

/** The courier's services for the address, as radio rows, or why there are none. */
function Services({
  addressDone,
  state,
  chosen,
  onChoose,
  onRetry,
  onCollect,
  sandbox,
}: {
  addressDone: boolean;
  state: QuoteState | null;
  chosen: DeliveryOption | null;
  onChoose: (code: string) => void;
  onRetry: () => void;
  onCollect: () => void;
  sandbox: boolean;
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
      <p className="services__note">Times count from when the courier collects it from the shop, once your order is made.</p>
      {sandbox ? <p className="services__note">Courier sandbox mode enabled</p> : null}
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
        {/* Beside checkout, so resetting a password never loses the form. */}
        <Link className="inline-link" href="/account" target="_blank">
          Forgot your password?
        </Link>
        <button type="button" className="inline-link" onClick={() => setOpen(false)}>
          Not now
        </button>
      </p>
    </div>
  );
}
