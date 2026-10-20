import "server-only";

import { HOURS, SHOP } from "@/app/site/data";
import { photoCount, rands } from "@/lib/catalog/listing";
import { escapeHtml as esc, sendEmail, type Mail } from "@/lib/email";
import { addressLine, deliveryLabel, deliveryPrice } from "./details";
import { fileCount, lineWhat, receiptPath, type EmailSent, type Order, type OrderLine } from "./order";
import { siteUrl } from "./site";

/**
 * The two emails a paid order sends: one to the shop, to go and make it, and
 * one to the customer, saying what they paid for and how it reaches them.
 * PayFast emails the customer its own payment receipt as well; this one is
 * the order.
 *
 * Settings, beside `lib/email.ts`'s: ORDER_EMAIL_TO, the inbox the shop's copy
 * goes to (the shop's own address when unset), and SITE_URL for links.
 */

const site = () => siteUrl() ?? "";
const shopInbox = () => process.env.ORDER_EMAIL_TO?.trim() || SHOP.email;

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

const fulfilmentText = (o: Order) =>
  o.fulfilment.method === "collect"
    ? "Collect from the shop"
    : `Courier, ${o.fulfilment.service.name}, to ${o.contact.firstName} ${o.contact.lastName}, ${addressLine(o.fulfilment.address)}, ${o.fulfilment.address.province}${o.fulfilment.address.notes ? ` (${o.fulfilment.address.notes})` : ""}`;

/** The order's lines and sums, the same in both emails. */
function summary(o: Order) {
  const delivery = deliveryLabel(o.fulfilment);
  const price = deliveryPrice(o.delivery);
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:16px;line-height:1.45">
      ${o.lines
        .map(
          (l) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e6e8ef;vertical-align:top">
          <strong>${esc(lineWhat(l))}</strong>
          ${lineDetails(l)
            .map((d) => `<br><span style="color:#555">${esc(d)}</span>`)
            .join("")}
        </td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #e6e8ef;vertical-align:top;text-align:right;white-space:nowrap">${rands(l.price * l.quantity)}</td>
      </tr>`,
        )
        .join("")}
      <tr><td style="padding:10px 0 2px">Subtotal</td><td style="padding:10px 0 2px;text-align:right">${rands(o.subtotal)}</td></tr>
      <tr><td style="padding:2px 0">${esc(delivery)}</td><td style="padding:2px 0;text-align:right">${price}</td></tr>
      <tr><td style="padding:8px 0;font-weight:700">Paid</td><td style="padding:8px 0;text-align:right;font-weight:700">${rands(o.total)}</td></tr>
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

const page = (body: string) => `<!doctype html>
<html><body style="margin:0;padding:24px 16px;background:#f5f6fa;color:#111;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:24px;background:#fff;border-radius:12px">${body}</div>
</body></html>`;

function shopEmail(o: Order): Mail {
  const admin = `${site()}/admin/orders/${o.ref}`;
  const sums = summary(o);
  const who = `${o.contact.firstName} ${o.contact.lastName}`;
  return {
    to: shopInbox(),
    replyTo: o.contact.email,
    subject: `New order ${o.ref}: ${rands(o.total)}, ${o.fulfilment.method === "collect" ? "to collect" : "by courier"}`,
    key: `order-paid/${o.ref}/shop`,
    html: page(`
      <h1 style="margin:0 0 4px;font-size:22px">New order ${o.ref}</h1>
      <p style="margin:0 0 16px;font-size:16px">Paid through PayFast (payment ${esc(o.payment?.pfPaymentId ?? "")}).</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5">
        <strong>${esc(who)}</strong><br>${esc(o.contact.phone)}<br>${esc(o.contact.email)}<br><br>${esc(fulfilmentText(o))}
      </p>
      ${sums.html}
      <p style="margin:20px 0 0;font-size:16px"><a href="${esc(admin)}" style="color:#0126ba">Open the order and its photos</a></p>`),
    text: [`New order ${o.ref}`, `Paid through PayFast (payment ${o.payment?.pfPaymentId ?? ""}).`, "", who, o.contact.phone, o.contact.email, "", fulfilmentText(o), "", sums.text, "", `Open the order and its photos: ${admin}`].join("\n"),
  };
}

function customerEmail(o: Order): Mail {
  const receipt = site() + receiptPath(o.ref, o.token);
  const sums = summary(o);
  const f = o.fulfilment;
  const collect = f.method === "collect";
  const whereText =
    f.method === "collect"
      ? [`Collect it from ${SHOP.name}, ${SHOP.street}, ${SHOP.town}, ${SHOP.postcode}, once it’s ready.`, ...HOURS.map((h) => `${h.days}: ${h.time}`)]
      : [`It goes to The Courier Guy (${f.service.name}) once it’s made, to:`, `${o.contact.firstName} ${o.contact.lastName}, ${addressLine(f.address)}, ${f.address.province}`];
  const contact = `Questions? Call ${SHOP.phoneDisplay} or reply to this email, and give your order number, ${o.ref}.`;
  return {
    to: o.contact.email,
    replyTo: SHOP.email,
    subject: `Your order ${o.ref} with ${SHOP.name}`,
    key: `order-paid/${o.ref}/customer`,
    html: page(`
      <h1 style="margin:0 0 4px;font-size:22px">Thank you, ${esc(o.contact.firstName)}</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Your order <strong>${o.ref}</strong> is paid and with the shop.</p>
      ${sums.html}
      <h2 style="margin:24px 0 6px;font-size:18px">${collect ? "Where to collect" : "Where it’s going"}</h2>
      <p style="margin:0;font-size:16px;line-height:1.5">${whereText.map(esc).join("<br>")}</p>
      <p style="margin:20px 0 0;font-size:16px;line-height:1.5"><a href="${esc(receipt)}" style="color:#0126ba">See your order online</a></p>
      <p style="margin:16px 0 0;font-size:16px;line-height:1.5;color:#555">${esc(contact)}</p>`),
    text: [`Thank you, ${o.contact.firstName}`, `Your order ${o.ref} is paid and with the shop.`, "", sums.text, "", ...whereText, "", `See your order online: ${receipt}`, "", contact].join("\n"),
  };
}

/**
 * Sends a paid order's emails, or one of them, and says how each went.
 * Writes nothing: the caller records the result. `keySuffix` is for the
 * admin's resend: a new key, so Resend sends it even within a day of the first.
 */
export async function orderEmails(order: Order, only?: "shop" | "customer", keySuffix = ""): Promise<{ shop?: EmailSent; customer?: EmailSent }> {
  const which = only ? [only] : (["shop", "customer"] as const);
  const results = await Promise.all(
    which.map(async (who) => {
      const mail = who === "shop" ? shopEmail(order) : customerEmail(order);
      mail.key += keySuffix;
      const sent = await sendEmail(mail);
      if (!sent.ok) console.error(`Order email (${who}) not sent`, order.ref, sent.error);
      return [who, { at: new Date().toISOString(), ok: sent.ok, ...(sent.ok ? {} : { error: sent.error }) }] as const;
    }),
  );
  return Object.fromEntries(results);
}
