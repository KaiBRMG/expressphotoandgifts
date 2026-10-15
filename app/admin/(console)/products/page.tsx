import type { Metadata } from "next";
import { listCategories, listProducts } from "@/lib/admin/products";
import { readinessIssues, toDraft } from "@/lib/catalog/edit";
import { primaryPhoto } from "@/lib/catalog/listing";
import { ProductsTable, type Row } from "./ProductsTable";

export const metadata: Metadata = { title: "Products" };

/** What keeps a product out of the shop, as a word or two on its row. */
const FLAGS: Record<string, string> = {
  "prices-grid": "No price",
  "photos-add": "No photo",
  "filter-type": "No type",
  "customer-count": "No photo count",
};

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const [products, categories, params] = await Promise.all([listProducts(), listCategories(), searchParams]);

  const rows: Row[] = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    code: p.code,
    categoryId: p.categoryId,
    status: p.status,
    special: p.special,
    min: p.priceRange?.min ?? null,
    max: p.priceRange?.max ?? null,
    photo: primaryPhoto(p),
    flags: p.status === "archived" ? [] : readinessIssues(toDraft(p)).map((i) => FLAGS[i.field] ?? i.message),
    updatedAt: p.updatedAt,
  }));

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  return (
    <ProductsTable
      rows={rows}
      categories={categories.map((c) => ({ value: c.id, label: c.name }))}
      initial={{ q: first(params.q), status: first(params.status), category: first(params.category) }}
    />
  );
}
