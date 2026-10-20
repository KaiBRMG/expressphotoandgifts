import Link from "next/link";
import { NEED_LABELS, productNeeds, type Need } from "@/lib/catalog/edit";
import type { Vocabulary } from "@/lib/catalog/tags";
import type { Product } from "@/lib/catalog/types";
import { Alert, ArrowRight, Check } from "@/app/site/icons";

type Reason = { key: string; label: string; fix: string; count: number; href: string; ready?: boolean };

const LIST = "/admin/products?status=unfinished";

/**
 * Hidden products, by what keeps them hidden: one line per reason, with how
 * to fix it and how many it holds. A reason held by one product goes straight
 * to the control that fixes it; more go to the list, narrowed to them.
 */
export function HiddenProducts({ products, vocabulary }: { products: Product[]; vocabulary: Vocabulary }) {
  const hidden = products.filter((p) => p.status === "draft");
  const byNeed = new Map<Need, { fix: string; slugs: string[]; href: string }>();
  const ready: Product[] = [];

  for (const p of hidden) {
    const needs = productNeeds(p, vocabulary).filter((i) => i.need);
    if (needs.length === 0) ready.push(p);
    for (const i of needs) {
      const entry = byNeed.get(i.need!) ?? { fix: i.message, slugs: [], href: `/admin/products/${p.slug}?tab=${i.tab}&fix=${i.field}` };
      entry.slugs.push(p.slug);
      byNeed.set(i.need!, entry);
    }
  }

  const reasons: Reason[] = [...byNeed]
    .map(([need, e]) => ({
      key: need,
      label: NEED_LABELS[need],
      fix: e.fix,
      count: e.slugs.length,
      href: e.slugs.length === 1 ? e.href : LIST,
    }))
    .sort((a, b) => b.count - a.count);
  if (ready.length)
    reasons.push({
      key: "ready",
      label: "Ready to show",
      fix: "Has everything; switch it to In the shop",
      count: ready.length,
      href: ready.length === 1 ? `/admin/products/${ready[0].slug}` : "/admin/products?status=ready",
      ready: true,
    });

  // A product can lack more than one thing, so the lines can add up to more than the products.
  const overlap = reasons.reduce((n, r) => n + r.count, 0) > hidden.length;

  return (
    <section className="widget" aria-labelledby="hidden-title">
      <header className="widget__head">
        <h2 id="hidden-title" className="widget__title">
          Hidden from the shop
        </h2>
        {hidden.length ? (
          <Link href={ready.length === hidden.length ? "/admin/products?status=ready" : LIST} className="widget__total" aria-label={`${hidden.length} hidden ${hidden.length === 1 ? "product" : "products"}, see them all`}>
            {hidden.length}
            <ArrowRight size={18} />
          </Link>
        ) : null}
      </header>

      {hidden.length === 0 ? (
        <p className="hidden__clear">
          <Check size={20} />
          Every product is in the shop.
        </p>
      ) : (
        <>
          <ul className="hidden__list">
            {reasons.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className={`hidden__row${r.ready ? " hidden__row--ready" : ""}`}>
                  <span className="hidden__why">
                    {r.ready ? <Check size={18} /> : <Alert size={18} />}
                    {r.label}
                  </span>
                  <span className="hidden__fix">{r.fix}</span>
                  <span className="hidden__n">
                    {r.count}
                    <span className="visually-hidden">{r.count === 1 ? " product" : " products"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {overlap ? <p className="widget__note">Some products lack more than one thing.</p> : null}
        </>
      )}
    </section>
  );
}
