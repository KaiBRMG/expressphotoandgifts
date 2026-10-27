import type { CampaignFeature, FeatureTile } from "@/lib/campaignFeature";
import { escapeHtml as esc } from "@/lib/email";
import { button, C, FONT, link, panel, para } from "@/lib/emailLayout";

/**
 * A campaign's block of a marketing email (`lib/campaignFeature.ts`): the deals
 * in large type, when they run, the products as photo tiles, one button, the
 * fine print. Tables and inline styles only, like the rest of the shop's email.
 *
 * It has to read with images off, so everything a shopper needs (the deal, the
 * product, its price) is text, never part of a picture. Tiles are two to a row
 * at any width, so the layout needs no media query; a photo's `width` and
 * `height` attributes are set because Outlook ignores the CSS.
 */

/** A photo's side in a tile at the sheet's full width: (600 − 2 × 28 padding − 16 gutter) / 2. */
const SIDE = 264;

const text = `font-family:${FONT}`;

function tile(t: FeatureTile): string {
  const a = (inner: string, style = "") => `<a href="${esc(t.href)}" style="color:${C.ink};text-decoration:none;${style}">${inner}</a>`;
  return `
    ${
      t.image
        ? `<a href="${esc(t.href)}" style="text-decoration:none"><img src="${esc(t.image)}" width="${SIDE}" height="${SIDE}" alt="${esc(t.name)}" style="display:block;width:100%;max-width:${SIDE}px;height:auto;border:0;border-radius:10px;background:${C.wash};${text};font-size:16px;color:${C.soft}"></a>`
        : ""
    }
    <p style="margin:10px 0 0;${text};font-size:16px;line-height:1.35;font-weight:700;color:${C.ink}">${a(esc(t.name), "text-decoration:underline")}</p>
    ${t.deal ? `<p style="margin:2px 0 0;${text};font-size:16px;line-height:1.35;font-weight:700;color:${C.blue}">${esc(t.deal)}</p>` : ""}
    <p style="margin:2px 0 0;${text};font-size:16px;line-height:1.35;color:${C.ink}">${esc(t.price)}${t.was ? ` <span style="color:${C.soft}">was <span style="text-decoration:line-through">${esc(t.was)}</span></span>` : ""}</p>`;
}

/** The tiles in rows of two; an odd one out leaves its neighbour's cell empty so it keeps its width. */
function grid(tiles: FeatureTile[]): string {
  const rows: string[] = [];
  for (let i = 0; i < tiles.length; i += 2) {
    const pair = [tiles[i], tiles[i + 1]];
    rows.push(
      `<tr>${pair
        .map((t, col) => `<td width="50%" valign="top" style="width:50%;padding:0 ${col === 0 ? "8px 22px 0" : "0 22px 8px"}">${t ? tile(t) : ""}</td>`)
        .join("")}</tr>`,
    );
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;table-layout:fixed;border-collapse:collapse">${rows.join("")}</table>`;
}

/** What to do with the code, said the same in the email's words and its plain text. */
const codeWords = (f: CampaignFeature) =>
  `Enter this code in the “Discount code” box at checkout, or the deal won’t apply. It works once, on one order, and was made for this email.${f.when ? ` ${f.when}.` : ""}`;

/** The customer's code, large and apart, with how to use it. Nothing about it is in a picture. */
function codePanel(f: CampaignFeature): string {
  return panel(
    `<p style="margin:0 0 6px;${text};font-size:16px;line-height:1.4;font-weight:700;color:${C.ink}">Your code</p>
     <p style="margin:0 0 12px;font-family:'Courier New',Courier,monospace;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:0.08em;color:${C.blue}">${esc(f.code ?? "")}</p>
     <p style="margin:0;${text};font-size:16px;line-height:1.5;color:${C.ink}"><strong>Use it at checkout.</strong> ${esc(codeWords(f))}</p>`,
  );
}

export function featureHtml(f: CampaignFeature): string {
  const offer = [
    ...f.deals.map((d) => `<p style="margin:0 0 8px;${text};font-size:22px;line-height:1.25;font-weight:700;letter-spacing:-0.01em;color:${C.blue}">${esc(d)}</p>`),
    f.blurb ? `<p style="margin:4px 0 0;${text};font-size:16px;line-height:1.5;color:${C.ink}">${esc(f.blurb)}</p>` : "",
    f.when ? `<p style="margin:12px 0 0;${text};font-size:16px;line-height:1.4;font-weight:700;color:${C.ink}">${esc(f.when)}</p>` : "",
  ].join("");

  return [
    panel(offer),
    f.needsCode && f.code ? codePanel(f) : "",
    f.needsCode && f.tiles.length ? para("Prices below are with your code, applied at checkout. The shop itself shows the usual price.", { soft: true }) : "",
    f.tiles.length ? grid(f.tiles) : "",
    button(f.href, f.cta),
    f.more > 0 ? para(`…and ${f.more} more ${f.more === 1 ? "product" : "products"} ${link(f.href, "in the shop")}.`, { html: true, soft: true }) : "",
    f.conditions.length ? para(f.conditions.join(" "), { soft: true }) : "",
  ].join("");
}

/** The same block as plain text, for the email's text part and clients that don't show HTML. */
export function featureText(f: CampaignFeature): string {
  return [
    ...f.deals.map((d) => `* ${d}`),
    ...(f.blurb ? ["", f.blurb] : []),
    ...(f.when ? ["", f.when] : []),
    ...(f.needsCode && f.code ? ["", `YOUR CODE: ${f.code}`, `Use it at checkout. ${codeWords(f)}`] : []),
    ...(f.needsCode && f.tiles.length ? ["", "Prices below are with your code, applied at checkout. The shop itself shows the usual price."] : []),
    ...(f.tiles.length ? ["", ...f.tiles.flatMap((t) => [`${t.name}${t.deal ? `: ${t.deal}` : ""}, ${t.price}${t.was ? ` (was ${t.was})` : ""}`, t.href, ""])] : [""]),
    ...(f.more > 0 ? [`…and ${f.more} more in the shop.`, ""] : []),
    `${f.cta}: ${f.href}`,
    ...(f.conditions.length ? ["", f.conditions.join(" ")] : []),
  ].join("\n");
}
