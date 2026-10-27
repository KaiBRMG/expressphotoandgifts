import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getVocabulary } from "@/lib/catalog/queries";
import { listCategories, listProducts } from "@/lib/admin/products";
import { NEED_LABELS, productNeeds, type Issue } from "@/lib/catalog/edit";
import { primaryPhoto } from "@/lib/catalog/listing";
import { productDeal } from "@/lib/catalog/campaigns";
import { getLiveDeals } from "@/lib/campaigns";
import { tagLabels, words } from "@/lib/catalog/search";
import { ProductsTable, type Need, type Row } from "./ProductsTable";

export const metadata: Metadata = { title: "Products" };

/** A need as its row shows it: a word or two, and the control in the editor that fixes it. */
const toNeed = (i: Issue): Need => ({ kind: i.need, label: i.need ? NEED_LABELS[i.need] : i.message, hint: i.message, tab: i.tab, field: i.field });

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const [products, categories, vocabulary, params, deals] = await Promise.all([listProducts(), listCategories(), getVocabulary(), searchParams, getLiveDeals()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const rows: Row[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    code: p.code,
    categoryId: p.categoryId,
    status: p.status,
    // In a live campaign: what the shop shows as a special.
    special: p.status === "active" && productDeal(p, deals).special,
    min: p.priceRange?.min ?? null,
    max: p.priceRange?.max ?? null,
    photo: primaryPhoto(p),
    needs: productNeeds(p, vocabulary).map(toNeed),
    // Everything a search can find it by, in the shop search's own words: name, codes, category and filter tags.
    search: [p.name, p.code, ...p.variants.map((v) => v.sku), categoryName.get(p.categoryId) ?? "", ...tagLabels(p, vocabulary)].flatMap(words),
    updatedAt: p.updatedAt,
  }));

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  return (
    <ProductsTable
      rows={rows}
      categories={categories.map((c) => ({ value: c.id, label: c.name }))}
      initial={{
        q: first(params.q),
        status: first(params.status),
        category: first(params.category),
        needs: first(params.needs) === "1",
        sort: first(params.sort),
        desc: first(params.dir) === "desc",
      }}
      now={new Date().toISOString()}
    />
  );
}
