import { HOURS, SHOP } from "@/app/site/data";
import { escapeHtml as esc } from "@/lib/email";

/**
 * The shop's email design, shared by every email: a blue header carrying the
 * logo (`public/logo/email.png`: the logo flattened on the brand blue, small, so it can't show white text on a white ground in a client that drops transparency), one white sheet of content, and a
 * footer with the shop's address, hours and phone. Email clients ignore most
 * CSS, so it is tables and inline styles, in the brand's blue and amber with
 * a system sans (web fonts don't load in most inboxes). Text is never under
 * 16px, the same rule as the site.
 *
 * Each email builds its body from the pieces below and hands it to `shell`.
 */

export const C = {
  blue: "#0126ba",
  gold: "#ffb72a",
  ink: "#0b1233",
  soft: "#4a5174",
  rule: "#dde2f5",
  wash: "#f1f4fd",
  ground: "#e9edfa",
} as const;

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

/** Where a link in an email goes; the logo is fetched from here too, so it shows only once SITE_URL is the public address. */
export type Base = string;

type ShellInput = {
  base: Base;
  /** The inbox preview line, before the email is opened. */
  preheader: string;
  body: string;
  /** Leaves out the shop's address and hours, for the email that goes to the shop itself. */
  internal?: boolean;
};

export function shell({ base, preheader, body, internal }: ShellInput): string {
  const hours = HOURS.map((h) => `${esc(h.days)}: ${esc(h.time)}`).join("<br>");
  const footer = internal
    ? `<p style="margin:0;font:400 16px/1.5 ${FONT};color:${C.soft}">An automatic message from the shop’s website.</p>`
    : `<p style="margin:0 0 12px;font:600 16px/1.4 ${FONT};color:${C.ink}">${esc(SHOP.name)}</p>
       <p style="margin:0 0 12px;font:400 16px/1.55 ${FONT};color:${C.soft}"><a href="${esc(SHOP.mapsUrl)}" style="color:${C.soft};text-decoration:underline">${esc(SHOP.street)}, ${esc(SHOP.town)}, ${esc(SHOP.postcode)}</a><br>${hours}</p>
       <p style="margin:0;font:400 16px/1.55 ${FONT};color:${C.soft}"><a href="tel:+${SHOP.phoneE164}" style="color:${C.blue};text-decoration:underline">${esc(SHOP.phoneDisplay)}</a> &nbsp;·&nbsp; <a href="mailto:${esc(SHOP.email)}" style="color:${C.blue};text-decoration:underline">${esc(SHOP.email)}</a></p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(SHOP.name)}</title></head>
<body style="margin:0;padding:0;background:${C.ground};-webkit-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.ground}"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;border-collapse:separate">
      <tr><td bgcolor="${C.blue}" style="background:${C.blue};border-radius:14px 14px 0 0;padding:26px 28px 24px">
        <a href="${esc(base || SHOP.name)}" style="text-decoration:none"><img src="${esc(base)}/logo/email.png" width="280" height="18" alt="${esc(SHOP.name)}" style="display:block;border:0;width:280px;max-width:100%;height:auto;font:600 18px/1.2 ${FONT};color:#ffffff"></a>
      </td></tr>
      <tr><td style="height:5px;background:${C.gold};font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="background:#ffffff;padding:32px 28px 36px;font:400 16px/1.6 ${FONT};color:${C.ink}">${body}</td></tr>
      <tr><td style="background:${C.wash};border-radius:0 0 14px 14px;padding:24px 28px;border-top:1px solid ${C.rule}">${footer}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** The email's headline, in the brand blue. */
export const heading = (text: string) => `<h1 style="margin:0 0 12px;font:700 28px/1.15 ${FONT};letter-spacing:-0.02em;color:${C.blue}">${esc(text)}</h1>`;

export const subheading = (text: string) => `<h2 style="margin:32px 0 8px;font:700 19px/1.3 ${FONT};letter-spacing:-0.01em;color:${C.ink}">${esc(text)}</h2>`;

/** A paragraph; `html` is already safe, `text` is escaped. */
export const para = (text: string, opts: { soft?: boolean; html?: boolean } = {}) =>
  `<p style="margin:0 0 16px;font:400 16px/1.6 ${FONT};color:${opts.soft ? C.soft : C.ink}">${opts.html ? text : esc(text)}</p>`;

/** Amber with dark text, the one call to action. Padded to a comfortable thumb target. */
export const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:${C.gold};border-radius:10px"><a href="${esc(href)}" style="display:inline-block;padding:15px 26px;font:700 16px/1.2 ${FONT};color:#000000;text-decoration:none;border-radius:10px">${esc(label)}</a></td></tr></table>`;

/** A quiet text link for the second way on. */
export const link = (href: string, label: string) => `<a href="${esc(href)}" style="color:${C.blue};text-decoration:underline">${esc(label)}</a>`;

/** A tinted block for the one fact the email is about: a tracking number, an amount, a time. */
export const panel = (inner: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="background:${C.wash};border:1px solid ${C.rule};border-radius:12px;padding:20px 22px">${inner}</td></tr></table>`;

/** A small label above a big value inside a panel. */
export const figure = (label: string, value: string) =>
  `<p style="margin:0 0 4px;font:600 16px/1.3 ${FONT};color:${C.soft}">${esc(label)}</p><p style="margin:0;font:700 30px/1.15 ${FONT};letter-spacing:-0.02em;color:${C.blue};word-break:break-all">${esc(value)}</p>`;

/** The line under every customer email. */
export const help = (ref?: string) =>
  para(`Questions? Call ${SHOP.phoneDisplay} or reply to this email${ref ? `, and give your order number, ${ref}` : ""}.`, { soft: true });

/** A rule between groups. */
export const rule = `<div style="height:1px;background:${C.rule};margin:24px 0;font-size:0;line-height:0">&nbsp;</div>`;
