import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrderForAdmin } from "@/lib/admin/orders";
import { printSpecs } from "@/lib/admin/printSpecs";
import { lineWhat } from "@/lib/checkout/order";
import { rawUrl } from "@/lib/checkout/photoUrls";
import { AutoPrint } from "./AutoPrint";

export async function generateMetadata({ params }: PageProps<"/admin/print/[ref]">): Promise<Metadata> {
  return { title: `Print ${(await params).ref}` };
}

const one = (v: string | string[] | undefined) => (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

/**
 * The order's photos as they print: one to a sheet, each the original upload
 * at its print size where the product names one, otherwise fitted to the
 * page. `?line=` narrows it to one line, and `&set=&slot=` to one photo.
 * Opens the print dialog once every photo has loaded.
 */
export default async function PrintPage({ params, searchParams }: PageProps<"/admin/print/[ref]">) {
  await requireAdmin();
  const [{ ref }, q] = await Promise.all([params, searchParams]);
  const found = await getOrderForAdmin(ref);
  if (!found) notFound();
  const o = found.order;
  const specs = await printSpecs(o);
  const [line, set, slot] = [one(q.line), one(q.set), one(q.slot)];

  const pages = o.lines.flatMap((l, li) =>
    line !== null && li !== line
      ? []
      : l.sets.flatMap((s, si) =>
          set !== null && si !== set
            ? []
            : s.files
                .filter((f) => slot === null || f.slot === slot)
                .map((f) => ({ key: `${li}-${si}-${f.slot}`, file: f, what: lineWhat(l), label: f.label || `Photo ${f.slot + 1}`, spec: specs[li] })),
        ),
  );
  if (!pages.length) notFound();

  return (
    <div className="pview">
      <header className="pview__bar">
        <p>
          <span className="mono">{o.ref}</span> · {pages.length} {pages.length === 1 ? "photo" : "photos"}
        </p>
        <AutoPrint />
      </header>
      {pages.map((p) => (
        <figure key={p.key} className="pview__page">
          {/* eslint-disable-next-line @next/next/no-img-element -- the original upload, untouched, is what prints */}
          <img
            src={rawUrl(p.file.publicId, p.file.version)}
            alt={p.label}
            className={p.spec?.print ? "pview__img pview__img--sized" : "pview__img"}
            style={p.spec?.print ? { width: `${p.spec.print.w}cm`, height: `${p.spec.print.h}cm` } : undefined}
          />
          <figcaption className="pview__cap">
            {p.what} · {p.label}
            {p.spec?.print ? ` · ${+p.spec.print.w.toFixed(1)} × ${+p.spec.print.h.toFixed(1)} cm` : ""}
            {p.spec && p.spec.shape !== "rect" ? ` · ${p.spec.shape}` : ""}
            {p.file.edited ? " · edited" : ""}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
