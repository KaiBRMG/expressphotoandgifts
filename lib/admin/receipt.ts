import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, setCharacterSpacing, type Color, type PDFFont, type PDFPage } from "pdf-lib";
import { HOURS, LEGAL, SHOP } from "@/app/site/data";
import { shopContact } from "@/lib/settings";
import { at } from "@/app/admin/when";
import { cartSavings } from "@/lib/catalog/campaigns";
import { photoCount, rands, signedRands } from "@/lib/catalog/listing";
import { orderWhat } from "@/lib/catalog/purchase";
import { deliveryLabel, deliveryPrice } from "@/lib/checkout/details";
import { fileCount, refundedOf, stageLabel, statusText, type Order, type OrderLine } from "@/lib/checkout/order";

/* A4 in points. */
const W = 595.28;
const H = 841.89;
const M = 44;
const CW = W - 2 * M;

/*
 * The shop's colours as DESIGN.md sets them: brand blue is the ink, secondary
 * text and rules are that blue at 80%, 72%, 20% and 12% (mixed onto white
 * here, since a printer has no alpha), and amber appears only on the blue.
 */
const mix = (a: number, [r, g, b]: number[], [r0, g0, b0]: number[]) => rgb((r * a + r0 * (1 - a)) / 255, (g * a + g0 * (1 - a)) / 255, (b * a + b0 * (1 - a)) / 255);
const BRAND = [1, 38, 186];
const PAPER = [255, 255, 255];
const BLUE = mix(1, BRAND, PAPER);
const SOFT = mix(0.8, BRAND, PAPER);
const FAINT = mix(0.72, BRAND, PAPER);
const HAIR = mix(0.2, BRAND, PAPER);
const RULE = mix(0.12, BRAND, PAPER);
const WHITE = mix(1, PAPER, BRAND);
const WHITE_SOFT = mix(0.8, PAPER, BRAND);

/*
 * The shop's own faces, Archivo and Geist Mono (both SIL Open Font License,
 * in `lib/admin/fonts`), and its logo, read once per server process.
 */
type Glyphs = { hasGlyphForCodePoint(cp: number): boolean };
const FONTS = path.join(process.cwd(), "lib/admin/fonts");
let assets: Promise<{ regular: Buffer; semibold: Buffer; mono: Buffer; logo: Buffer; glyphs: Glyphs }> | null = null;
const loadAssets = () =>
  (assets ??= Promise.all([
    readFile(path.join(FONTS, "Archivo-Regular.ttf")),
    readFile(path.join(FONTS, "Archivo-SemiBold.ttf")),
    readFile(path.join(FONTS, "GeistMono-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/logo/new.png")),
  ]).then(([regular, semibold, mono, logo]) => ({ regular, semibold, mono, logo, glyphs: fontkit.create(regular) })));

/** Never broken across lines. */
const whole = (s: string) => s.replace(/ /g, "\u00a0");

type Style = { font: PDFFont; size: number; color: Color; lead: number; /** Tracking in em. */ track?: number };

/** What a line says under its name: photos, words, frame and note, and how its price came about. */
function lineDetails(l: OrderLine): string[] {
  const files = fileCount(l);
  const words = l.sets.map((s) => s.words.trim()).filter(Boolean);
  return [
    files > 0 ? photoCount(files) : "",
    ...words.map((w, i) => (words.length > 1 ? `Words ${i + 1}: “${w}”` : `Words: “${w}”`)),
    l.frame?.empty ? "Frame only, no print" : "",
    l.frame?.quote ? "Print to be quoted" : "",
    l.note ? `Note: “${l.note}”` : "",
    l.base ? `On special from ${rands(l.base)} each` : "",
    l.paid !== undefined && l.paid !== l.price * l.quantity ? `${rands(l.paid)} after deals` : "",
  ].filter(Boolean);
}

/** A rectangle with round corners, its top-left at (x, top). */
function rounded(page: PDFPage, x: number, top: number, w: number, h: number, r: number, o: { color?: Color; borderColor?: Color; borderDashArray?: number[] }) {
  const d = `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
  page.drawSvgPath(d, { x, y: top, borderWidth: o.borderColor ? 0.75 : 0, ...o });
}

/** Draws top-down on as many pages as the order needs; `room` turns the page and draws the continuation head. */
class Sheet {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  /** Drawn at the top of every page after the first: the running head, and the table's head while inside it. */
  onNewPage: (() => void)[] = [];
  constructor(
    private doc: PDFDocument,
    private glyphs: Glyphs,
  ) {}
  newPage() {
    this.page = this.doc.addPage([W, H]);
    this.pages.push(this.page);
    this.y = H - M;
    if (this.pages.length > 1) this.onNewPage.forEach((f) => f());
  }
  /** Turns the page unless `h` points still fit above the colophon. */
  room(h: number) {
    if (this.y - h < M + 30) this.newPage();
  }
  /** Drops what Archivo can't draw (an emoji in a note), keeping an unusually accented letter as its base letter. */
  clean(s: string) {
    return [...s]
      .map((c) => {
        if (this.glyphs.hasGlyphForCodePoint(c.codePointAt(0)!)) return c;
        const base = c.normalize("NFD")[0];
        return base && base !== c && this.glyphs.hasGlyphForCodePoint(base.codePointAt(0)!) ? base : "";
      })
      .join("")
      .replace(/ +(?=[”’)\].,!?;:]|$)/g, "");
  }
  width(s: string, st: Style) {
    const t = this.clean(s);
    return st.font.widthOfTextAtSize(t, st.size) + (st.track ?? 0) * st.size * Math.max(0, [...t].length - 1);
  }
  text(s: string, x: number, y: number, st: Style, align: "left" | "right" = "left") {
    const t = this.clean(s);
    const tc = (st.track ?? 0) * st.size;
    if (tc) this.page.pushOperators(setCharacterSpacing(tc));
    this.page.drawText(t, { x: align === "right" ? x - this.width(t, st) : x, y, size: st.size, font: st.font, color: st.color });
    if (tc) this.page.pushOperators(setCharacterSpacing(0));
  }
  /** Breaks `s` into lines no wider than `max`, breaking a word only when it alone is wider. */
  wrap(s: string, max: number, st: Style): string[] {
    const out: string[] = [];
    let line = "";
    // Ordinary spaces only: a no-break space (`whole`) holds a date or a sum together.
    for (const word of this.clean(s).split(/[ \t\n]+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (this.width(next, st) <= max) line = next;
      else {
        if (line) out.push(line);
        let w = word;
        while (this.width(w, st) > max) {
          let n = w.length;
          while (n > 1 && this.width(w.slice(0, n), st) > max) n--;
          out.push(w.slice(0, n));
          w = w.slice(n);
        }
        line = w;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [""];
  }
  /** Wrapped lines from (x, y) down; returns the height they take. */
  block(lines: string[], x: number, y: number, st: Style) {
    lines.forEach((l, i) => this.text(l, x, y - i * st.lead, st));
    return lines.length * st.lead;
  }
  rule(y: number, color = RULE, x0 = M, x1 = W - M, thickness = 0.6) {
    this.page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
  }
}

/**
 * The order as a printable A4 receipt on the shop's letterhead: the shop, the
 * customer, how it is collected or delivered, every line with what the
 * customer chose, the sums with each deal and refund, and the PayFast
 * payment. An unpaid order prints as an order summary, never as a receipt.
 */
export async function receiptPdf(o: Order): Promise<Uint8Array> {
  const [a, reach] = await Promise.all([loadAssets(), shopContact()]);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // Tabular figures, so every column of rands lines up digit under digit.
  const [regular, semibold, mono, logo] = await Promise.all([
    doc.embedFont(a.regular, { subset: true, features: { tnum: true } }),
    doc.embedFont(a.semibold, { subset: true, features: { tnum: true } }),
    doc.embedFont(a.mono, { subset: true }),
    doc.embedPng(a.logo),
  ]);
  const paid = o.status === "paid";
  const kind = paid ? "Receipt" : "Order summary";
  doc.setTitle(`${kind} ${o.ref}`);
  doc.setAuthor(SHOP.name);
  doc.setCreator(SHOP.name);

  /* DESIGN.md's type roles at print sizes: Archivo for anything read as words, Geist Mono for marks, codes and the colophon. */
  const T = {
    headline: { font: semibold, size: 26, color: BLUE, lead: 30, track: -0.03 },
    lede: { font: regular, size: 11.5, color: SOFT, lead: 16 },
    ledeStrong: { font: semibold, size: 11.5, color: BLUE, lead: 16 },
    mark: { font: mono, size: 7.5, color: FAINT, lead: 11, track: 0.16 },
    body: { font: regular, size: 10, color: BLUE, lead: 14 },
    strong: { font: semibold, size: 10, color: BLUE, lead: 14 },
    name: { font: semibold, size: 10.5, color: BLUE, lead: 14 },
    small: { font: regular, size: 9, color: SOFT, lead: 12.5 },
    code: { font: mono, size: 8.5, color: SOFT, lead: 12 },
    total: { font: semibold, size: 13, color: BLUE, lead: 17 },
    colophon: { font: mono, size: 7, color: FAINT, lead: 10, track: 0.06 },
    band: { font: regular, size: 9, color: WHITE_SOFT, lead: 12.5 },
    bandStrong: { font: semibold, size: 9.5, color: WHITE, lead: 12.5 },
  } satisfies Record<string, Style>;

  const s = new Sheet(doc, a.glyphs);
  s.onNewPage.push(() => {
    s.text(`${o.ref}  ·  ${kind}, continued`.toUpperCase(), M, s.y - 8, T.mark);
    s.y -= 34;
  });
  s.newPage();

  // Letterhead: the logo on a brand-blue panel inside the margins (a home printer can't print to the edge), the shop beside it.
  const bandTop = H - M + 8;
  const bandH = 66;
  const bandMid = bandTop - bandH / 2;
  rounded(s.page, M, bandTop, CW, bandH, 12, { color: BLUE });
  const lh = 27;
  s.page.drawImage(logo, { x: M + 22, y: bandMid - lh / 2, width: (lh * logo.width) / logo.height, height: lh });
  s.text(SHOP.name, W - M - 22, bandMid + 10, T.bandStrong, "right");
  [`${SHOP.street}, ${SHOP.town} ${SHOP.postcode}`, `${reach.phoneDisplay}  ·  ${reach.email}`].forEach((l, i) => s.text(l, W - M - 22, bandMid - 4 - i * T.band.lead, T.band, "right"));
  s.y = bandTop - bandH - 46;

  // What this is, in one sentence.
  s.text(kind, M, s.y, T.headline);
  if (!paid) {
    const pw = s.width("NOT PAID", T.mark) + 22;
    rounded(s.page, W - M - pw, s.y + 15, pw, 20, 10, { borderColor: FAINT, borderDashArray: [2, 2] });
    s.text("NOT PAID", W - M - 11, s.y + 2, T.mark, "right");
  }
  s.y -= 24;
  const [lead, rest] = paid
    ? [`${rands(o.total)} paid`, `on ${o.paidAt ? at(o.paidAt) : "a date not recorded"}, for order ${o.ref}.`]
    : [`${rands(o.total)} due`, `for order ${o.ref}. It has not been paid, so this is a summary, not a receipt.`];
  const leadW = s.width(`${lead}\u00a0`, T.ledeStrong);
  s.text(lead, M, s.y, T.ledeStrong);
  const restLines = s.wrap(rest, CW - leadW, T.lede);
  s.text(restLines[0], M + leadW, s.y, T.lede);
  for (const l of restLines.slice(1)) s.text(l, M, (s.y -= T.lede.lead), T.lede);
  s.y -= 34;

  // The order's numbers, as a ruled strip.
  const f = o.fulfilment;
  const strip: [string, string, Style][] = [
    ["Order", o.ref, { ...T.code, size: 10, color: BLUE }],
    ["Placed", at(o.createdAt), T.body],
    ["Paid", paid && o.paidAt ? at(o.paidAt) : "Not paid", T.body],
    ["Status", paid ? stageLabel(o.stage ?? "new", f.method) : "Waiting for payment", T.body],
  ];
  const cellW = CW / strip.length;
  s.rule(s.y + 12, HAIR);
  strip.forEach(([label, value, st], i) => {
    s.text(label.toUpperCase(), M + i * cellW, s.y - 6, T.mark);
    s.text(value, M + i * cellW, s.y - 22, st);
  });
  s.y -= 36;
  s.rule(s.y, HAIR);
  s.y -= 34;

  // Who it's for, and how it leaves the shop.
  const colW = (CW - 28) / 2;
  const name = `${o.contact.firstName} ${o.contact.lastName}`;
  const ship = f.method === "courier" && o.shipment?.state === "booked" ? o.shipment : undefined;
  const rows = (...r: ([string, Style] | false | "" | undefined)[]) => r.filter((x): x is [string, Style] => !!x);
  const columns: [string, [string, Style][]][] = [
    ["Customer", rows([name, T.strong], [o.contact.email, T.body], [o.contact.phone, T.body], !!o.uid && ["Has an account with the shop", T.small])],
    f.method === "collect"
      ? ["Collection", rows(["Collect from the shop", T.strong], [`${SHOP.street}, ${SHOP.town} ${SHOP.postcode}`, T.body], ...HOURS.map((h): [string, Style] => [`${h.days}: ${h.time}`, T.small]))]
      : [
          "Deliver to",
          rows(
            [f.recipient?.name || name, T.strong],
            !!f.recipient && [`${f.recipient.phone}, receiving it as a gift`, T.body],
            [f.address.street, T.body],
            [[f.address.suburb, f.address.city].filter(Boolean).join(", "), T.body],
            [`${f.address.province} ${f.address.code}`, T.body],
            !!f.address.notes && [`Courier notes: ${f.address.notes}`, T.small],
            [`The Courier Guy, ${f.service.name}${f.service.cover ? `, insured for ${rands(f.service.cover)}` : ""}`, T.small],
            !!ship?.tracking && [`Waybill ${ship.tracking}${ship.status ? `, ${statusText(ship.status).toLowerCase()}` : ""}`, T.small],
          ),
        ],
  ];
  const wrapped = columns.map(([label, rs]) => [label, rs.map(([t, st]) => [s.wrap(t, colW, st), st] as const)] as const);
  const colH = Math.max(...wrapped.map(([, rs]) => rs.reduce((n, [ls, st]) => n + ls.length * st.lead, 0)));
  s.room(colH + 20);
  const top = s.y;
  wrapped.forEach(([label, rs], i) => {
    const x = M + i * (colW + 28);
    s.text(label.toUpperCase(), x, top, T.mark);
    let y = top - 18;
    for (const [ls, st] of rs) y -= s.block(ls, x, y, st);
  });
  s.y = top - 18 - colH - 34;

  // The lines, with the table's head again on every page it runs onto.
  const col = { sku: M + 246, qty: M + 380, each: M + 444, amount: W - M };
  const itemW = col.sku - M - 18;
  const head = () => {
    s.text("ITEM", M, s.y, T.mark);
    s.text("SKU", col.sku, s.y, T.mark);
    s.text("QTY", col.qty, s.y, T.mark, "right");
    s.text("EACH", col.each, s.y, T.mark, "right");
    s.text("AMOUNT", col.amount, s.y, T.mark, "right");
    s.y -= 8;
    s.rule(s.y, HAIR);
    s.y -= 20;
  };
  s.room(90);
  head();
  s.onNewPage.push(head);
  o.lines.forEach((l, i) => {
    const title = s.wrap(orderWhat(l.name, l.variant), itemW, T.name);
    const details = lineDetails(l).flatMap((d) => s.wrap(d, itemW, T.small));
    const sku = s.wrap(l.sku, col.qty - col.sku - 30, T.code);
    const h = Math.max(title.length * T.name.lead + details.length * T.small.lead, sku.length * T.code.lead);
    s.room(h + 8);
    const y = s.y;
    s.block(title, M, y, T.name);
    s.block(details, M, y - title.length * T.name.lead + 1, T.small);
    s.block(sku, col.sku, y, T.code);
    s.text(String(l.quantity), col.qty, y, T.body, "right");
    s.text(rands(l.price), col.each, y, T.body, "right");
    s.text(rands(l.price * l.quantity), col.amount, y, T.body, "right");
    s.y = y - h - 4;
    if (i < o.lines.length - 1) s.rule(s.y + 4);
    s.y -= 16;
  });
  s.onNewPage.pop();
  s.rule(s.y + 12, HAIR);
  s.y -= 20;

  // The payment, beside the sums.
  const refunds = o.refunds ?? [];
  const sums: { label: string; value: string; st: Style; line?: boolean }[] = [
    { label: "Subtotal", value: rands(o.subtotal), st: T.body },
    ...cartSavings(o).map((v) => ({ label: v.label || v.name, value: signedRands(-v.amount), st: T.body })),
    { label: deliveryLabel(f), value: deliveryPrice(o.delivery), st: T.body },
    { label: paid ? "Total paid" : "Total due", value: rands(o.total), st: T.total, line: true },
    ...refunds.map((r) => ({ label: `Refunded ${whole(at(r.at))}`, value: signedRands(-r.amount), st: { ...T.body, color: SOFT } })),
    ...(refunds.length ? [{ label: "Total after refunds", value: rands(o.total - refundedOf(o)), st: T.total, line: true }] : []),
  ];
  const p = o.payment;
  const payment: [string, string, Style][] = p
    ? [
        ["Method", "PayFast", T.body],
        ["PayFast ID", p.pfPaymentId, T.code],
        ["Reference", p.attempt, T.code],
        ["Paid", at(p.at), T.body],
        ["Amount", rands(Math.round(Number(p.amountGross) * 100)), T.body],
      ]
    : [["Status", o.attempts ? `Not paid, ${o.attempts} ${o.attempts === 1 ? "attempt" : "attempts"} to pay` : "Not paid", T.body]];
  if (o.terms) payment.push(["Terms", `Version ${o.terms.version}, accepted ${whole(at(o.terms.at))}`, T.body]);

  const sumW = 222;
  const sumX = W - M - sumW;
  const payLabelW = 66;
  const payW = sumX - M - 40 - payLabelW;
  const payRows = payment.map(([label, value, st]) => [label, s.wrap(value, payW, st), st] as const);
  const sumRows = sums.map((r) => ({ ...r, lines: s.wrap(r.label, sumW - 84, r.st) }));
  const payH = 18 + payRows.reduce((n, [, ls]) => n + ls.length * 15, 0);
  const sumH = sumRows.reduce((n, r) => n + r.lines.length * r.st.lead + (r.line ? 20 : 4), 0);
  // The thanks closes the sums, so the two never part across a page.
  const legal = [LEGAL.registeredName, LEGAL.registrationNumber && `Reg. no. ${LEGAL.registrationNumber}`, LEGAL.vatNumber && `VAT no. ${LEGAL.vatNumber}`].filter(Boolean).join("  ·  ");
  const ask = s.wrap(`Questions? Call ${reach.phoneDisplay} or email ${reach.email}, and give your order number, ${o.ref}.`, CW, T.small);
  const thanksH = 30 + ask.length * T.small.lead + (legal ? 16 : 0);
  s.room(Math.max(payH, sumH) + 34 + thanksH);
  const top2 = s.y;

  s.text("PAYMENT", M, top2, T.mark);
  let py = top2 - 18;
  for (const [label, ls, st] of payRows) {
    s.text(label, M, py, T.small);
    py -= s.block(ls, M + payLabelW, py, { ...st, lead: 15 });
  }

  let sy = top2;
  for (const r of sumRows) {
    if (r.line) {
      s.rule(sy + 6, BLUE, sumX, W - M, 1.1);
      sy -= 14;
    }
    s.block(r.lines, sumX, sy, r.st);
    s.text(r.value, W - M, sy, r.st, "right");
    sy -= r.lines.length * r.st.lead + (r.line ? 6 : 4);
  }
  s.y = Math.min(py, sy) - 34;

  // Thanks, and who the shop is.
  s.rule(s.y + 16, HAIR);
  s.y -= 6;
  s.text(`Thank you for shopping with ${SHOP.name}.`, M, s.y, { ...T.strong, size: 11 });
  s.y -= 17;
  s.y -= s.block(ask, M, s.y, T.small);
  if (legal) s.text(legal, M, s.y - 2, T.small);

  // Every page's colophon.
  const printed = `Printed ${at(new Date().toISOString())}`;
  s.pages.forEach((pg, i) => {
    s.page = pg;
    s.text(`${o.ref}  ·  ${kind}  ·  ${printed}`.toUpperCase(), M, M - 16, T.colophon);
    s.text(`${i + 1} / ${s.pages.length}`, W - M, M - 16, T.colophon, "right");
  });

  return doc.save();
}
