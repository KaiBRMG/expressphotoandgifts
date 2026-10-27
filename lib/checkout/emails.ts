import "server-only";

import { HOURS, SHOP } from "@/app/site/data";
import type { ShopContact } from "@/lib/contact";
import { cartSavings } from "@/lib/catalog/campaigns";
import { photoCount, rands, signedRands } from "@/lib/catalog/listing";
import { escapeHtml as esc, sendEmail, type Mail } from "@/lib/email";
import { addressLine, deliveryLabel, deliveryPrice } from "./details";
import { refundLineWhat } from "./refunds";
import { fileCount, lineWhat, receiptPath, refundedOf, type EmailSent, type Order, type OrderLine } from "./order";
import { button, C, figure, heading, help, link, panel, para, rule, shell, subheading } from "@/lib/emailLayout";
import { orderRecipients, shopContact } from "@/lib/settings";
import { siteUrl } from "./site";
import { unsubscribeLinks } from "@/lib/unsubscribe";
import { featureHtml, featureText } from "@/lib/campaignEmail";
import type { CampaignFeature } from "@/lib/campaignFeature";

/**
 * The emails an order sends, all in the design of `lib/emailLayout.ts`: to the
 * shop when it's paid, to go and make it; to the customer when it's paid
 * (what they paid for and how it reaches them), when the courier has collected
 * it, when it's ready to collect, and when a refund is made. PayFast
 * emails the customer its own payment receipt as well; these are the order.
 * The account welcome is here too, since it shares the design.
 *
 * The shop's copy goes to the addresses on the admin's Settings page
 * (`lib/settings.ts`), and links use SITE_URL.
 */

const site = () => siteUrl() ?? "";

/** What a line is, after its name: photos, words, frame and note. */
function lineDetails(l: OrderLine): string[] {
  const files = fileCount(l);
  return [
    files > 0 ? photoCount(files) + (l.sets.some((s) => s.words) ? ", with words" : "") : "",
    l.frame?.empty ? "Frame only, no print" : "",
    l.frame?.quote ? "Print to be quoted" : "",
    l.note ? `Note: “${l.note}”` : "",
    l.base ? `${rands(l.price)} each, on special from ${rands(l.base)}` : "",
  ].filter(Boolean);
}

/** Who the courier delivers to: the recipient named at checkout, or the buyer. */
const deliverTo = (o: Order) => {
  const f = o.fulfilment;
  return f.method === "courier" && f.recipient ? `${f.recipient.name} (${f.recipient.phone})` : `${o.contact.firstName} ${o.contact.lastName}`;
};

const fulfilmentText = (o: Order) => {
  const f = o.fulfilment;
  if (f.method === "collect") return "Collect from the shop";
  const cover = f.service.cover ? `, insured to ${rands(f.service.cover)}` : "";
  return `Courier, ${f.service.name}${cover}, to ${deliverTo(o)}, ${addressLine(f.address)}, ${f.address.province}${f.address.notes ? ` (${f.address.notes})` : ""}`;
};

/** The order's lines and sums, the same in the shop's and the customer's emails. */
function summary(o: Order) {
  const delivery = deliveryLabel(o.fulfilment);
  const price = deliveryPrice(o.delivery);
  const cell = `font:400 16px/1.45 Arial,Helvetica,sans-serif;color:${C.ink}`;
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;${cell}">
      ${o.lines
        .map(
          (l) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${C.rule};vertical-align:top;${cell}">
          <strong>${esc(lineWhat(l))}</strong>
          ${lineDetails(l)
            .map((d) => `<br><span style="color:${C.soft}">${esc(d)}</span>`)
            .join("")}
        </td>
        <td style="padding:12px 0 12px 16px;border-bottom:1px solid ${C.rule};vertical-align:top;text-align:right;white-space:nowrap;${cell}">${rands(l.price * l.quantity)}</td>
      </tr>`,
        )
        .join("")}
      <tr><td style="padding:14px 0 2px;${cell};color:${C.soft}">Subtotal</td><td style="padding:14px 0 2px;text-align:right;${cell}">${rands(o.subtotal)}</td></tr>
      ${cartSavings(o)
        .map((s) => `<tr><td style="padding:2px 0;${cell};color:${C.soft}">${esc(s.label)}</td><td style="padding:2px 0;text-align:right;${cell}">${signedRands(-s.amount)}</td></tr>`)
        .join("")}
      <tr><td style="padding:2px 0;${cell};color:${C.soft}">${esc(delivery)}</td><td style="padding:2px 0;text-align:right;${cell}">${price}</td></tr>
      <tr><td style="padding:12px 0 0;border-top:2px solid ${C.blue};font:700 18px/1.3 Arial,Helvetica,sans-serif;color:${C.blue}">Paid</td><td style="padding:12px 0 0;border-top:2px solid ${C.blue};text-align:right;font:700 18px/1.3 Arial,Helvetica,sans-serif;color:${C.blue}">${rands(o.total)}</td></tr>
    </table>`;
  const text = [
    ...o.lines.map((l) => [`${lineWhat(l)}  ${rands(l.price * l.quantity)}`, ...lineDetails(l).map((d) => `   ${d}`)].join("\n")),
    "",
    `Subtotal  ${rands(o.subtotal)}`,
    ...cartSavings(o).map((s) => `${s.label}  ${signedRands(-s.amount)}`),
    `${delivery}  ${price}`,
    `Paid  ${rands(o.total)}`,
  ].join("\n");
  return { html, text };
}

const questions = (o: Order, reach: ShopContact) => `Questions? Call ${reach.phoneDisplay} or reply to this email, and give your order number, ${o.ref}.`;
const receiptUrl = (o: Order) => site() + receiptPath(o.ref, o.token);
const hoursText = () => HOURS.map((h) => `${h.days}: ${h.time}`);
const hoursHtml = () => HOURS.map((h) => `<span style="color:${h.closed ? C.soft : C.ink}">${esc(h.days)}: <strong>${esc(h.time)}</strong></span>`).join("<br>");

/** A fact in a panel: its label and what it says, as lines. */
const fact = (label: string, lines: string[]) =>
  `<p style="margin:0 0 4px;font:600 16px/1.3 Arial,Helvetica,sans-serif;color:${C.soft}">${esc(label)}</p><p style="margin:0;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${C.ink}">${lines.map(esc).join("<br>")}</p>`;

const shopAddress = () => [SHOP.name, SHOP.street, `${SHOP.town}, ${SHOP.postcode}`];

function shopEmail(o: Order, reach: ShopContact, to: string[] = [reach.email]): Mail {
  const admin = `${site()}/admin/orders/${o.ref}`;
  const sums = summary(o);
  const who = `${o.contact.firstName} ${o.contact.lastName}`;
  const collect = o.fulfilment.method === "collect";
  return {
    to,
    replyTo: o.contact.email,
    subject: `New order ${o.ref}: ${rands(o.total)}, ${collect ? "to collect" : "by courier"}`,
    key: `order-paid/${o.ref}/shop`,
    html: shell({
      base: site(),
      internal: true,
      preheader: `${who} paid ${rands(o.total)}. ${collect ? "They’ll collect it." : "It goes by courier."}`,
      body: [
        heading(`New order ${o.ref}`),
        para(`Paid through PayFast, payment ${o.payment?.pfPaymentId ?? ""}.`, { soft: true }),
        panel(
          fact("Customer", [who, o.contact.phone, o.contact.email]) +
            `<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>` +
            fact(collect ? "Fulfilment" : "Courier", [fulfilmentText(o)]),
        ),
        sums.html,
        button(admin, "Open the order and its photos"),
      ].join(""),
    }),
    text: [`New order ${o.ref}`, `Paid through PayFast (payment ${o.payment?.pfPaymentId ?? ""}).`, "", who, o.contact.phone, o.contact.email, "", fulfilmentText(o), "", sums.text, "", `Open the order and its photos: ${admin}`].join("\n"),
  };
}

function customerEmail(o: Order, reach: ShopContact): Mail {
  const receipt = receiptUrl(o);
  const sums = summary(o);
  const f = o.fulfilment;
  const collect = f.method === "collect";
  const whereText =
    f.method === "collect"
      ? [`Collect it from ${SHOP.name}, ${SHOP.street}, ${SHOP.town}, ${SHOP.postcode}, once it’s ready.`, ...hoursText()]
      : [`It goes to The Courier Guy (${f.service.name}) once it’s made, to:`, `${deliverTo(o)}, ${addressLine(f.address)}, ${f.address.province}`];
  const contact = questions(o, reach);
  return {
    to: o.contact.email,
    replyTo: reach.email,
    subject: `Your order ${o.ref} with ${SHOP.name}`,
    key: `order-paid/${o.ref}/customer`,
    html: shell({
      base: site(),
      contact: reach,
      preheader: collect ? `Paid, and with the shop. We’ll email you when it’s ready to collect.` : `Paid, and with the shop. We’ll email you the tracking number once the courier has collected it.`,
      body: [
        heading(`Thank you, ${o.contact.firstName}`),
        para(`Your order <strong>${esc(o.ref)}</strong> is paid and with the shop. ${collect ? "We’ll email you when it’s ready to collect." : "We’ll email you the tracking number once it’s on its way."}`, { html: true }),
        sums.html,
        subheading(collect ? "Where to collect" : "Where it’s going"),
        panel(
          collect
            ? fact("The shop", shopAddress()) + `<p style="margin:12px 0 0;font:400 16px/1.55 Arial,Helvetica,sans-serif">${hoursHtml()}</p>`
            : fact(`The Courier Guy, ${f.method === "courier" ? f.service.name : ""}`, [deliverTo(o), f.method === "courier" ? `${addressLine(f.address)}, ${f.address.province}` : ""].filter(Boolean)),
        ),
        button(receipt, "Track my order"),
        help(reach, o.ref),
      ].join(""),
    }),
    text: [`Thank you, ${o.contact.firstName}`, `Your order ${o.ref} is paid and with the shop.`, "", sums.text, "", ...whereText, "", `Track your order: ${receipt}`, "", contact].join("\n"),
  };
}

/**
 * To the buyer once The Courier Guy has collected the parcel from the shop
 * (not when it is booked: a booking can wait a day for the driver): the
 * waybill's tracking number, and who the courier will contact. Keyed by the
 * waybill, so a new waybill (after a cancelled one) sends again but a retry
 * doesn't.
 */
function shippedEmail(o: Order, reach: ShopContact): Mail {
  const f = o.fulfilment;
  const tracking = o.shipment?.tracking ?? "";
  const receipt = receiptUrl(o);
  const lines =
    f.method === "courier"
      ? [
          `Your order ${o.ref} has left the shop. The Courier Guy (${f.service.name}) has collected it.`,
          `Tracking number: ${tracking}`,
          f.recipient
            ? `The Courier Guy will SMS ${f.recipient.name} on ${f.recipient.phone} about the delivery, and the driver will call them.`
            : `The Courier Guy will SMS and email you about the delivery, and the driver will call you on ${o.contact.phone}.`,
          `Going to: ${addressLine(f.address)}, ${f.address.province}`,
        ]
      : [];
  const contact = questions(o, reach);
  return {
    to: o.contact.email,
    replyTo: reach.email,
    subject: `Your order ${o.ref} is on its way`,
    key: `order-shipped/${o.ref}/${tracking}`,
    html: shell({
      base: site(),
      contact: reach,
      preheader: `Collected by The Courier Guy. Tracking number ${tracking}.`,
      body: [
        heading(`It’s on its way, ${o.contact.firstName}`),
        para(`Your order <strong>${esc(o.ref)}</strong> has left the shop. The Courier Guy${f.method === "courier" ? ` (${esc(f.service.name)})` : ""} has collected it.`, { html: true }),
        panel(figure("Tracking number", tracking)),
        f.method === "courier"
          ? para(
              f.recipient
                ? `The Courier Guy will SMS ${f.recipient.name} on ${f.recipient.phone} about the delivery, and the driver will call them.`
                : `The Courier Guy will SMS and email you about the delivery, and the driver will call you on ${o.contact.phone}.`,
            ) + panel(fact("Going to", [deliverTo(o), `${addressLine(f.address)}, ${f.address.province}`]))
          : "",
        button(receipt, "Track my order"),
        help(reach, o.ref),
      ].join(""),
    }),
    text: [`It’s on its way, ${o.contact.firstName}`, "", ...lines, "", `Track your order: ${receipt}`, "", contact].join("\n"),
  };
}

/** To a customer collecting, when the shop marks the order ready. Sent once; the shop can resend it. */
function readyEmail(o: Order, reach: ShopContact): Mail {
  const receipt = receiptUrl(o);
  const contact = questions(o, reach);
  return {
    to: o.contact.email,
    replyTo: reach.email,
    subject: `Your order ${o.ref} is ready to collect`,
    key: `order-ready/${o.ref}`,
    html: shell({
      base: site(),
      contact: reach,
      preheader: `Come in any time we’re open, and give your order number, ${o.ref}.`,
      body: [
        heading(`Ready for you, ${o.contact.firstName}`),
        para(`Your order <strong>${esc(o.ref)}</strong> is made and waiting at the shop. Give your order number at the counter when you come in.`, { html: true }),
        panel(figure("Order number", o.ref)),
        subheading("Where and when"),
        panel(fact("The shop", [...shopAddress()]) + `<p style="margin:12px 0 0;font:400 16px/1.55 Arial,Helvetica,sans-serif">${hoursHtml()}</p>`),
        button(SHOP.mapsUrl, "Get directions"),
        para(`Your order online: ${link(receipt, "see what’s in it")}.`, { html: true, soft: true }),
        help(reach, o.ref),
      ].join(""),
    }),
    text: [`Ready for you, ${o.contact.firstName}`, `Your order ${o.ref} is made and waiting at the shop. Give your order number at the counter when you come in.`, "", ...shopAddress(), ...hoursText(), "", `Directions: ${SHOP.mapsUrl}`, `Your order online: ${receipt}`, "", contact].join("\n"),
  };
}

/**
 * To the buyer when the shop records a refund, or cancels the order (then in
 * the words of why, with the shop's message): how much, what for, anything
 * the terms let the shop keep back and why, and that it goes back to what
 * they paid with. The note staff add is for the shop's record and isn't sent. Keyed by the refund, so each refund sends once.
 */
function refundEmail(o: Order, reach: ShopContact): Mail {
  const refund = o.refunds?.[o.refunds.length - 1];
  const amount = refund?.amount ?? 0;
  const whole = refundedOf(o) >= o.total;
  const receipt = receiptUrl(o);
  const contact = questions(o, reach);
  const how = "PayFast sends it back to the card or account you paid with. How soon it shows depends on your bank.";
  // What it was for, and anything kept back and why: the customer sees how the amount was reached.
  const items = [
    ...(refund?.lines ?? []).map((l) => `${refundLineWhat(o, l)}: ${rands(l.amount)}`),
    ...(refund?.delivery ? [`Delivery: ${rands(refund.delivery)}`] : []),
    ...(refund?.keep ? [`Less ${refund.keep.note}: −${rands(refund.keep.amount)}`] : []),
  ];
  const cancelled = o.stage === "cancelled";
  // Why it was cancelled, in the shop's voice: for the customer who asked, by the shop when it can't supply it (10.4), or late (10.5).
  const opening = !cancelled
    ? `we’ve refunded ${whole ? "your order" : "part of your order"}`
    : refund?.reason === "unsupplied"
      ? "we’re sorry: we’ve had to cancel your order"
      : refund?.reason === "late"
        ? "as we couldn’t have it ready in time, we’ve cancelled your order"
        : "as you asked, we’ve cancelled your order";
  const title = cancelled ? "Your order is cancelled" : whole ? "Your refund is on its way" : "Part of your order is refunded";
  const message = refund?.message ?? "";
  return {
    to: o.contact.email,
    replyTo: reach.email,
    subject: cancelled ? `Order ${o.ref} is cancelled` : `Your refund for order ${o.ref}`,
    key: `order-refund/${o.ref}/${refund?.at ?? ""}`,
    html: shell({
      base: site(),
      contact: reach,
      preheader: `${rands(amount)} is on its way back to you.`,
      body: [
        heading(title),
        para(`Hi ${esc(o.contact.firstName)}, ${opening} <strong>${esc(o.ref)}</strong>.`, { html: true }),
        ...(message ? [para(message)] : []),
        panel(figure("Refunded", rands(amount)) + (whole || cancelled ? "" : `<p style="margin:12px 0 0;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${C.soft}">${esc(rands(refundedOf(o)))} of ${esc(rands(o.total))} refunded so far.</p>`)),
        ...(items.length ? [para(items.map(esc).join("<br>"), { html: true })] : []),
        para(how),
        rule,
        para(`Your order online: ${link(receipt, "see it here")}.`, { html: true, soft: true }),
        help(reach, o.ref),
      ].join(""),
    }),
    text: [title, "", `Hi ${o.contact.firstName}, ${opening} ${o.ref}.`, ...(message ? ["", message] : []), "", `Refunded: ${rands(amount)}`, whole || cancelled ? "" : `${rands(refundedOf(o))} of ${rands(o.total)} refunded so far.`, "", ...items, "", how, "", `Your order online: ${receipt}`, "", contact].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n"),
  };
}

/** To a new customer account, the moment it's made. `firstName` is null for the footer's sign-up, which only has an email. */
export function welcomeEmail(email: string, firstName: string | null, uid: string, reach: ShopContact): Mail {
  const shop = site() + "/shop";
  const account = site() + "/account";
  const hi = firstName ? `Welcome, ${firstName}` : "Welcome";
  return {
    to: email,
    replyTo: reach.email,
    subject: `Welcome to ${SHOP.name}`,
    key: `account-welcome/${uid}`,
    html: shell({
      base: site(),
      contact: reach,
      preheader: "Your details are saved, so next time checkout fills itself in.",
      body: [
        heading(hi),
        para(`Your account with ${SHOP.name} is ready. We keep your name, number and delivery address, so next time checkout fills itself in and you can get straight to choosing your photos.`),
        button(shop, "Start shopping"),
        para(`Your saved details are always at ${link(account, "your account")}, where you can change them.`, { html: true, soft: true }),
        rule,
        para(`We’re a real shop at ${SHOP.street}, ${SHOP.town}, and you’re welcome to call ${reach.phoneDisplay} or reply to this email with any question.`, { soft: true }),
      ].join(""),
    }),
    text: [hi, "", `Your account with ${SHOP.name} is ready. We keep your name, number and delivery address, so next time checkout fills itself in.`, "", `Start shopping: ${shop}`, `Your account: ${account}`, "", `Questions? Call ${reach.phoneDisplay} or reply to this email.`].join("\n"),
  };
}

/**
 * The shop's own message to customers who agreed to marketing email (specials
 * and campaigns): the subject and message staff typed, set in the shop's
 * design, with the reason they are getting it and how to stop it. A blank line
 * in the message starts a new paragraph. With a campaign (`lib/campaignFeature.ts`)
 * its deals, dates, products and photos follow the message, and the message may
 * be empty; without one, the email ends on a Shop now button. Sent through
 * `sendBatch`, which keys the send as a whole.
 */
export function marketingEmail(to: string, subject: string, message: string, reach: ShopContact, feature: CampaignFeature | null = null): Omit<Mail, "key"> {
  const account = site() + "/account";
  const paragraphs = message.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // One tap off, from the email itself: the link is signed for this address, so it needs no sign-in. Throws without SITE_URL; the senders check first.
  const off = unsubscribeLinks(to);
  const why = "You’re getting this because you agreed to marketing email from us.";
  const lead = paragraphs[0] ?? (feature ? [...feature.deals, feature.when].filter(Boolean).join(". ") : subject);
  return {
    to,
    replyTo: reach.email,
    subject,
    // RFC 8058: mail clients show their own Unsubscribe button and POST to the link, which stops the emails with no page in between.
    headers: { "List-Unsubscribe": `<${off.post}>, <mailto:${reach.email}?subject=Unsubscribe>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    html: shell({
      base: site(),
      contact: reach,
      title: subject,
      preheader: lead.replace(/\s+/g, " ").slice(0, 110),
      body: [
        heading(subject),
        ...paragraphs.map((p) => para(esc(p).replace(/\n/g, "<br>"), { html: true })),
        feature ? featureHtml(feature) : button(site() + "/shop", "Shop now"),
        rule,
        para(`${why} ${link(off.page, "Unsubscribe")}, or turn it off any time in ${link(account, "your account")}.`, { html: true, soft: true }),
      ].join(""),
    }),
    text: [subject, "", ...paragraphs.flatMap((p) => [p, ""]), ...(feature ? [featureText(feature), ""] : [`Shop now: ${site()}/shop`, ""]), `${why} Unsubscribe: ${off.page}`, "", `Questions? Call ${reach.phoneDisplay} or reply to this email.`].join("\n"),
  };
}

/** The link that confirms a footer sign-up: only following it subscribes the address. */
export function confirmSubscriptionEmail(email: string, url: string, key: string, reach: ShopContact): Mail {
  return {
    to: email,
    replyTo: reach.email,
    subject: "Confirm your email to get our specials",
    key,
    html: shell({
      base: site(),
      contact: reach,
      preheader: "One tap and you’re on the list.",
      body: [
        heading("Is this your email?"),
        para(`Someone asked to get specials and campaigns from ${SHOP.name} at ${esc(email)}. If that was you, tap below and you’re on the list.`, { html: true }),
        button(url, "Yes, send me specials"),
        para("The link works for 3 days. If it wasn’t you, ignore this email and nothing will change: you won’t hear from us.", { soft: true }),
      ].join(""),
    }),
    text: ["Is this your email?", "", `Someone asked to get specials and campaigns from ${SHOP.name} at ${email}. If that was you, open this link and you’re on the list:`, url, "", "The link works for 3 days. If it wasn’t you, ignore this email and nothing will change: you won’t hear from us."].join("\n"),
  };
}

/** The account page's link to prove the email is the customer's, which brings in the orders placed with it before the account. */
export function checkEmail(email: string, link: string, key: string, reach: ShopContact): Mail {
  return {
    to: email,
    replyTo: reach.email,
    subject: "Find your earlier orders",
    key,
    html: shell({
      base: site(),
      contact: reach,
      preheader: "One tap shows us this email is yours, and your earlier orders join your account.",
      body: [
        heading("Is this your email?"),
        para(`You asked to see orders placed with ${email} before you had an account with ${SHOP.name}. Tap below and we’ll add them to your account, with their receipts and tracking.`),
        button(link, "Yes, add my orders"),
        para("The link works for 24 hours. If you didn’t ask for this, you can ignore this email and nothing will change.", { soft: true }),
      ].join(""),
    }),
    text: ["Is this your email?", "", `You asked to see orders placed with ${email} before you had an account with ${SHOP.name}. Open this link and we’ll add them to your account:`, link, "", "The link works for 24 hours. If you didn’t ask for this, ignore this email and nothing will change."].join("\n"),
  };
}

/** An order's emails, by who they're for, as the admin names them. */
export const EMAIL_NAMES = {
  shop: "The shop’s email",
  customer: "The customer’s email",
  shipped: "The “on its way” email",
  ready: "The “ready to collect” email",
  refund: "The refund email",
} as const;
export type OrderEmail = keyof typeof EMAIL_NAMES;

export const BUILDERS: Record<OrderEmail, (o: Order, reach: ShopContact, shopTo?: string[]) => Mail> = { shop: shopEmail, customer: customerEmail, shipped: shippedEmail, ready: readyEmail, refund: refundEmail };

/**
 * Sends a paid order's emails (the shop's and the customer's, or the one
 * named), and says how each went. Writes nothing: the caller records the
 * result. `keySuffix` is for the admin's resend: a new key, so Resend sends
 * it even within a day of the first.
 */
export async function orderEmails(order: Order, only?: OrderEmail, keySuffix = ""): Promise<Partial<Record<OrderEmail, EmailSent>>> {
  const which: OrderEmail[] = only ? [only] : ["shop", "customer"];
  const [shopTo, reach] = await Promise.all([which.includes("shop") ? orderRecipients() : [], shopContact()]);
  const results = await Promise.all(
    which.map(async (who) => {
      if (who === "shop" && shopTo.length === 0) return [who, { at: new Date().toISOString(), ok: false, error: "The shop’s new-order email is turned off in Settings." }] as const;
      const mail = BUILDERS[who](order, reach, shopTo);
      mail.key += keySuffix;
      const sent = await sendEmail(mail);
      if (!sent.ok) console.error(`Order email (${who}) not sent`, order.ref, sent.error);
      return [who, { at: new Date().toISOString(), ok: sent.ok, ...(sent.ok ? {} : { error: sent.error }) }] as const;
    }),
  );
  return Object.fromEntries(results);
}

/** The welcome to a new account; failing to send never fails the account. */
export async function sendWelcome(email: string, firstName: string | null, uid: string): Promise<void> {
  const sent = await sendEmail(welcomeEmail(email, firstName, uid, await shopContact()));
  if (!sent.ok) console.error("Welcome email not sent", uid, sent.error);
}
