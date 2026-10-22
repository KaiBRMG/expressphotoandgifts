"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import type { PlacedFile } from "@/lib/checkout/order";
import { fittedUrl, rawUrl, THUMB } from "@/lib/checkout/photoUrls";
import type { PhotoShape } from "@/lib/catalog/tags";
import { Download, Printer } from "@/app/site/icons";

export type SheetSet = { title: string | null; words: string; files: PlacedFile[] };

export type SheetLine = {
  what: string;
  sku: string;
  price: string;
  /** Short flags for the maker: "Frame only", "Quote the print", the customer's note. */
  notes: string[];
  /** The print area in cm and the outline, from the product's photo tags; null when the product isn't found or takes no photo. */
  print: { w: number; h: number } | null;
  shape: PhotoShape | null;
  sets: SheetSet[];
};

const SHAPES: Record<PhotoShape, string | null> = { rect: null, round: "Round", dome: "Dome" };

/** "10 × 15 cm", without trailing zeros. */
const cm = (p: { w: number; h: number }) => `${+p.w.toFixed(1)} × ${+p.h.toFixed(1)} cm`;

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "image/gif": "gif", "image/tiff": "tif" };

/** "photo-1", "front": a label safe in a file name. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "photo";

/**
 * Saves the original upload under a name that says where it goes. Read
 * straight from Cloudinary in the browser (no transformation, so no new
 * derived size on the free plan); if the browser can't read it, the original
 * opens in a tab to save from there.
 */
async function save(file: PlacedFile, name: string) {
  const url = rawUrl(file.publicId, file.version);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${name}.${EXT[blob.type] ?? "jpg"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

type Item = { file: PlacedFile; name: string };

/** Downloads its files one after another, counting as it goes. */
function DownloadButton({ items, label, variant = "light", fullWidth }: { items: Item[]; label: string; variant?: "light" | "default"; fullWidth?: boolean }) {
  const [done, setDone] = useState<number | null>(null);
  const run = async () => {
    for (let i = 0; i < items.length; i++) {
      setDone(i);
      await save(items[i].file, items[i].name);
    }
    setDone(null);
  };
  return (
    <Button variant={variant} size="sm" fullWidth={fullWidth} leftSection={<Download size={18} />} disabled={done !== null} onClick={run}>
      {done === null ? label : `${done + 1} of ${items.length}`}
    </Button>
  );
}

function PrintButton({ href, label, variant = "light", fullWidth }: { href: string; label: string; variant?: "light" | "default"; fullWidth?: boolean }) {
  return (
    <Button fullWidth={fullWidth} component="a" href={href} target="_blank" rel="noopener" variant={variant} size="sm" leftSection={<Printer size={18} />}>
      {label}
    </Button>
  );
}

/**
 * Every file the customer sent, grouped by what it goes on, each with its
 * print size and shape and its own Download and Print; a line, and the whole
 * order, can be downloaded or printed at once.
 */
export function PrintSheet({ ref_, lines }: { ref_: string; lines: SheetLine[] }) {
  const base = `/admin/print/${ref_}`;
  const itemsOf = (li: number) =>
    lines[li].sets.flatMap((s, si) =>
      s.files.map((f) => ({ file: f, name: `${ref_}-${li + 1}${lines[li].sets.length > 1 ? `-${si + 1}` : ""}-${slug(f.label || `photo ${f.slot + 1}`)}` })),
    );
  const all = lines.flatMap((_, li) => itemsOf(li));

  return (
    <section className="osec sheet" aria-labelledby="sheet-title">
      <header className="sheet__head">
        <h2 id="sheet-title" className="osec__title">
          To make <span className="ocount">{all.length ? `${all.length} ${all.length === 1 ? "photo" : "photos"}` : `${lines.length} ${lines.length === 1 ? "item" : "items"}`}</span>
        </h2>
        {all.length > 1 ? (
          <div className="sheet__acts">
            <DownloadButton items={all} label="Download all" variant="default" />
            <PrintButton href={base} label="Print all" variant="default" />
          </div>
        ) : null}
      </header>

      <ol className="sheet__lines">
        {lines.map((l, li) => {
          const items = itemsOf(li);
          const size = l.print ? cm(l.print) : null;
          const shape = l.shape ? SHAPES[l.shape] : null;
          return (
            <li key={l.sku + li} className="sline">
              <div className="sline__head">
                <div className="sline__what">
                  <span className="sline__name">{l.what}</span>
                  <span className="sline__meta">
                    <span className="mono">{l.sku}</span>
                    {size ? <span className="ochip">{size}</span> : null}
                    {shape ? <span className="ochip">{shape}</span> : null}
                    {!items.length ? <span className="ochip ochip--quiet">No photo</span> : null}
                  </span>
                </div>
                <span className="sline__price">{l.price}</span>
                {items.length > 1 ? (
                  <div className="sline__acts">
                    <DownloadButton items={items} label={`Download ${items.length}`} variant="default" />
                    <PrintButton href={`${base}?line=${li}`} label={`Print ${items.length}`} variant="default" />
                  </div>
                ) : null}
              </div>

              {l.notes.length ? (
                <ul className="sline__notes">
                  {l.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : null}

              {l.sets.map((s, si) => (
                <div key={si} className="sset">
                  {s.title ? <p className="sset__title">{s.title}</p> : null}
                  {s.words ? (
                    <p className="sset__words">
                      <span>Words</span> &ldquo;{s.words}&rdquo;
                    </p>
                  ) : null}
                  {s.files.length ? (
                    <ul className="stiles">
                      {s.files.map((f) => {
                        const label = f.label || `Photo ${f.slot + 1}`;
                        const item = items.find((it) => it.file === f)!;
                        return (
                          <li key={f.slot} className="stile">
                            <a href={rawUrl(f.publicId, f.version)} target="_blank" rel="noopener" className="stile__img" aria-label={`${label}, full size`}>
                              {/* eslint-disable-next-line @next/next/no-img-element -- the shared Cloudinary thumbnail, already sized */}
                              <img src={fittedUrl(f.publicId, f.version, THUMB)} alt="" loading="lazy" />
                            </a>
                            <div className="stile__info">
                              <span className="stile__label">{label}</span>
                              {f.edited ? <span className="ochip ochip--edit">Edited</span> : null}
                            </div>
                            <div className="stile__acts">
                              <DownloadButton items={[item]} label="Download" fullWidth />
                              <PrintButton fullWidth href={`${base}?line=${li}&set=${si}&slot=${f.slot}`} label="Print" />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              ))}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
