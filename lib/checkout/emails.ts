import "server-only";

import { HOURS, SHOP } from "@/app/site/data";
import { photoCount, rands } from "@/lib/catalog/listing";
import { escapeHtml as esc, sendEmail, type Mail } from "@/lib/email";
import { addressLine, deliveryLabel, deliveryPrice } from "./details";
import { fileCount, lineWhat, receiptPath, refundedOf, type EmailSent, type Order, type OrderLine } from "./order";
import { button, C, figure, heading, help, link, panel, para, rule, shell, subheading } from "@/lib/emailLayout";
import { orderRecipients } from "@/lib/settings";
import { siteUrl } from "./site";

/**
 * The emails an order sends, all in the design of `lib/emailLayout.ts`: to the
 * shop when it's paid, to go and make it; to the customer when it's paid
 * (what they paid for and how it reaches them), when it's booked with the
 * courier, when it's ready to collect, and when a refund is made. PayFast
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
      <tr><td style="padding:2px 0;${cell};color:${C.soft}">${esc(delivery)}</td><td style="padding:2px 0;text-align:right;${cell}">${price}</td></tr>
      <tr><td style="padding:12px 0 0;border-top:2px solid ${C.blue};font:700 18px/1.3 Arial,Helvetica,sans-serif;color:${C.blue}">Paid</td><td style="padding:12px 0 0;border-top:2px solid ${C.blue};text-align:right;font:700 18px/1.3 Arial,Helvetica,sans-serif;color:${C.blue}">${rands(o.total)}</td></tr>
    </table>`;
  const text = [
    ...o.lines.map((l) => [`${lineWhat(l)}  ${rands(l.price * l.quantity)}`, ...lineDetails(l).map((d) => `   ${d}`)].join("\n")),
    "",
    `Subtotal  ${rands(o.subtotal)}`,
    `${delivery}  ${price}`,
    `Paid  ${rands(o.total)}`,
  ].join("\n");
  return { html, text };
}

const questions = (o: Order) => `Questions? Call ${SHOP.phoneDisplay} or reply to this email, and give your order number, ${o.ref}.`;
const receiptUrl = (o: Order) => site() + receiptPath(o.ref, o.token);
const hoursText = () => HOURS.map((h) => `${h.days}: ${h.time}`);
const hoursHtml = () => HOURS.map((h) => `<span style="color:${h.closed ? C.soft : C.ink}">${esc(h.days)}: <strong>${esc(h.time)}</strong></span>`).join("<br>");

/** A fact in a panel: its label and what it says, as lines. */
const fact = (label: string, lines: string[]) =>
  `<p style="margin:0 0 4px;font:600 16px/1.3 Arial,Helvetica,sans-serif;color:${C.soft}">${esc(label)}</p><p style="margin:0;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${C.ink}">${lines.map(esc).join("<br>")}</p>`;

const shopAddress = () => [SHOP.name, SHOP.street, `${SHOP.town}, ${SHOP.postcode}`];

function shopEmail(o: Order, to: string[] = [SHOP.email]): Mail {
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

function customerEmail(o: Order): Mail {
  const receipt = receiptUrl(o);
  const sums = summary(o);
  const f = o.fulfilment;
  const collect = f.method === "collect";
  const whereText =
    f.method === "collect"
      ? [`Collect it from ${SHOP.name}, ${SHOP.street}, ${SHOP.town}, ${SHOP.postcode}, once it’s ready.`, ...hoursText()]
      : [`It goes to The Courier Guy (${f.service.name}) once it’s made, to:`, `${deliverTo(o)}, ${addressLine(f.address)}, ${f.address.province}`];
  const contact = questions(o);
  return {
    to: o.contact.email,
    replyTo: SHOP.email,
    subject: `Your order ${o.ref} with ${SHOP.name}`,
    key: `order-paid/${o.ref}/customer`,
    html: shell({
      base: site(),
      preheader: collect ? `Paid, and with the shop. We’ll email you when it’s ready to collect.` : `Paid, and with the shop. We’ll email you the tracking number once it’s booked with the courier.`,
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
        help(o.ref),
      ].join(""),
    }),
    text: [`Thank you, ${o.contact.firstName}`, `Your order ${o.ref} is paid and with the shop.`, "", sums.text, "", ...whereText, "", `Track your order: ${receipt}`, "", contact].join("\n"),
  };
}

/**
 * To the buyer once the shop has booked the courier: the waybill's tracking
 * number, and who the courier will contact. Keyed by the waybill, so a new
 * waybill (after a cancelled one) sends again but a retry doesn't.
 */
function shippedEmail(o: Order): Mail {
  const f = o.fulfilment;
  const tracking = o.shipment?.tracking ?? "";
  const receipt = receiptUrl(o);
  const lines =
    f.method === "courier"
      ? [
          `Your order ${o.ref} is packed and booked with The Courier Guy (${f.service.name}). They collect it from the shop on their next round.`,
          `Tracking number: ${tracking}`,
          f.recipient
            ? `The Courier Guy will SMS ${f.recipient.name} on ${f.recipient.phone} about the delivery, and the driver will call them.`
            : `The Courier Guy will SMS and email you about the delivery, and the driver will call you on ${o.contact.phone}.`,
          `Going to: ${addressLine(f.address)}, ${f.address.province}`,
        ]
      : [];
  const contact = questions(o);
  return {
    to: o.contact.email,
    replyTo: SHOP.email,
    subject: `Your order ${o.ref} is on its way`,
    key: `order-shipped/${o.ref}/${tracking}`,
    html: shell({
      base: site(),
      preheader: `Booked with The Courier Guy. Tracking number ${tracking}.`,
      body: [
        heading(`It’s on its way, ${o.contact.firstName}`),
        para(`Your order <strong>${esc(o.ref)}</strong> is packed and booked with The Courier Guy${f.method === "courier" ? ` (${esc(f.service.name)})` : ""}. They collect it from the shop on their next round.`, { html: true }),
        panel(figure("Tracking number", tracking)),
        f.method === "courier"
          ? para(
              f.recipient
                ? `The Courier Guy will SMS ${f.recipient.name} on ${f.recipient.phone} about the delivery, and the driver will call them.`
                : `The Courier Guy will SMS and email you about the delivery, and the driver will call you on ${o.contact.phone}.`,
            ) + panel(fact("Going to", [deliverTo(o), `${addressLine(f.address)}, ${f.address.province}`]))
          : "",
        button(receipt, "Track my order"),
        help(o.ref),
      ].join(""),
    }),
    text: [`It’s on its way, ${o.contact.firstName}`, "", ...lines, "", `Track your order: ${receipt}`, "", contact].join("\n"),
  };
}

/** To a customer collecting, when the shop marks the order ready. Sent once; the shop can resend it. */
function readyEmail(o: Order): Mail {
  const receipt = receiptUrl(o);
  const contact = questions(o);
  return {
    to: o.contact.email,
    replyTo: SHOP.email,
    subject: `Your order ${o.ref} is ready to collect`,
    key: `order-ready/${o.ref}`,
    html: shell({
      base: site(),
      preheader: `Come in any time we’re open, and give your order number, ${o.ref}.`,
      body: [
        heading(`Ready for you, ${o.contact.firstName}`),
        para(`Your order <strong>${esc(o.ref)}</strong> is made and waiting at the shop. Give your order number at the counter when you come in.`, { html: true }),
        panel(figure("Order number", o.ref)),
        subheading("Where and when"),
        panel(fact("The shop", [...shopAddress()]) + `<p style="margin:12px 0 0;font:400 16px/1.55 Arial,Helvetica,sans-serif">${hoursHtml()}</p>`),
        button(SHOP.mapsUrl, "Get directions"),
        para(`Your order online: ${link(receipt, "see what’s in it")}.`, { html: true, soft: true }),
        help(o.ref),
      ].join(""),
    }),
    text: [`Ready for you, ${o.contact.firstName}`, `Your order ${o.ref} is made and waiting at the shop. Give your order number at the counter when you come in.`, "", ...shopAddress(), ...hoursText(), "", `Directions: ${SHOP.mapsUrl}`, `Your order online: ${receipt}`, "", contact].join("\n"),
  };
}

/**
 * To the buyer when the shop records a refund: how much, and that it goes
 * back to what they paid with. The reason staff note is for the shop's
 * record and isn't sent. Keyed by the refund, so each refund sends once.
 */
function refundEmail(o: Order): Mail {
  const refund = o.refunds?.[o.refunds.length - 1];
  const amount = refund?.amount ?? 0;
  const whole = refundedOf(o) >= o.total;
  const receipt = receiptUrl(o);
  const contact = questions(o);
  const how = "PayFast sends it back to the card or account you paid with. How soon it shows depends on your bank.";
  return {
    to: o.contact.email,
    replyTo: SHOP.email,
    subject: `Your refund for order ${o.ref}`,
    key: `order-refund/${o.ref}/${refund?.at ?? ""}`,
    html: shell({
      base: site(),
      preheader: `${rands(amount)} is on its way back to you.`,
      body: [
        heading(whole ? "Your refund is on its way" : "Part of your order is refunded"),
        para(`Hi ${esc(o.contact.firstName)}, we’ve refunded ${whole ? "your order" : "part of your order"} <strong>${esc(o.ref)}</strong>.`, { html: true }),
        panel(figure("Refunded", rands(amount)) + (whole ? "" : `<p style="margin:12px 0 0;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:${C.soft}">${esc(rands(refundedOf(o)))} of ${esc(rands(o.total))} refunded so far.</p>`)),
        para(how),
        rule,
        para(`Your order online: ${link(receipt, "see it here")}.`, { html: true, soft: true }),
        help(o.ref),
      ].join(""),
    }),
    text: [whole ? "Your refund is on its way" : "Part of your order is refunded", "", `Hi ${o.contact.firstName}, we’ve refunded ${whole ? "your order" : "part of your order"} ${o.ref}.`, `Refunded: ${rands(amount)}`, whole ? "" : `${rands(refundedOf(o))} of ${rands(o.total)} refunded so far.`, "", how, "", `Your order online: ${receipt}`, "", contact].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n"),
  };
}

/** To a new customer account, the moment it's made. `firstName` is null for the footer's sign-up, which only has an email. */
export function welcomeEmail(email: string, firstName: string | null, uid: string): Mail {
  const shop = site() + "/shop";
  const account = site() + "/account";
  const hi = firstName ? `Welcome, ${firstName}` : "Welcome";
  return {
    to: email,
    replyTo: SHOP.email,
    subject: `Welcome to ${SHOP.name}`,
    key: `account-welcome/${uid}`,
    html: shell({
      base: site(),
      preheader: "Your details are saved, so next time checkout fills itself in.",
      body: [
        heading(hi),
        para(`Your account with ${SHOP.name} is ready. We keep your name, number and delivery address, so next time checkout fills itself in and you can get straight to choosing your photos.`),
        button(shop, "Start shopping"),
        para(`Your saved details are always at ${link(account, "your account")}, where you can change them.`, { html: true, soft: true }),
        rule,
        para(`We’re a real shop at ${SHOP.street}, ${SHOP.town}, and you’re welcome to call ${SHOP.phoneDisplay} or reply to this email with any question.`, { soft: true }),
      ].join(""),
    }),
    text: [hi, "", `Your account with ${SHOP.name} is ready. We keep your name, number and delivery address, so next time checkout fills itself in.`, "", `Start shopping: ${shop}`, `Your account: ${account}`, "", `Questions? Call ${SHOP.phoneDisplay} or reply to this email.`].join("\n"),
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

export const BUILDERS: Record<OrderEmail, (o: Order, shopTo?: string[]) => Mail> = { shop: shopEmail, customer: customerEmail, shipped: shippedEmail, ready: readyEmail, refund: refundEmail };

/**
 * Sends a paid order's emails (the shop's and the customer's, or the one
 * named), and says how each went. Writes nothing: the caller records the
 * result. `keySuffix` is for the admin's resend: a new key, so Resend sends
 * it even within a day of the first.
 */
export async function orderEmails(order: Order, only?: OrderEmail, keySuffix = ""): Promise<Partial<Record<OrderEmail, EmailSent>>> {
  const which: OrderEmail[] = only ? [only] : ["shop", "customer"];
  const shopTo = which.includes("shop") ? await orderRecipients() : [];
  const results = await Promise.all(
    which.map(async (who) => {
      if (who === "shop" && shopTo.length === 0) return [who, { at: new Date().toISOString(), ok: false, error: "The shop’s new-order email is turned off in Settings." }] as const;
      const mail = BUILDERS[who](order, shopTo);
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
  const sent = await sendEmail(welcomeEmail(email, firstName, uid));
  if (!sent.ok) console.error("Welcome email not sent", uid, sent.error);
}
