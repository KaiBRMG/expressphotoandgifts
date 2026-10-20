import type { Metadata } from "next";
import { getVocabulary } from "@/lib/catalog/queries";
import { notFound } from "next/navigation";
import { getProductForEdit, listCategories, listProducts, tagSuggestions } from "@/lib/admin/products";
import { productNeeds } from "@/lib/catalog/edit";
import { primaryPhoto } from "@/lib/catalog/listing";
import { hasFacet } from "@/lib/catalog/tags";
import type { CatalogueItem } from "@/app/admin/editor/ProductEditor";
import { ProductEditor } from "@/app/admin/editor/ProductEditor";

export async function generateMetadata({ params }: PageProps<"/admin/products/[slug]">): Promise<Metadata> {
  const product = await getProductForEdit((await params).slug);
  return { title: product?.name ?? "Product" };
}

export default async function EditProductPage({ params }: PageProps<"/admin/products/[slug]">) {
  const { slug } = await params;
  const [product, categories, all, vocabulary] = await Promise.all([getProductForEdit(slug), listCategories(), listProducts(), getVocabulary()]);
  if (!product) notFound();

  // The work queue: the next product after this one, by name, that still lacks something.
  const queue = all.filter((p) => p.slug !== slug && productNeeds(p, vocabulary).length > 0);
  const after = queue.find((p) => p.name.localeCompare(product.name) > 0) ?? queue[0];
  const next = after ? { slug: after.slug, name: after.name, left: queue.length } : null;

  // Every other product, as much of it as "Goes with this" needs: to pick from, and to match by size.
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const catalogue: CatalogueItem[] = all
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      slug: p.slug,
      formerSlugs: p.formerSlugs,
      name: p.name,
      code: p.code,
      category: categoryName.get(p.categoryId) ?? "",
      photo: primaryPhoto(p),
      status: p.status,
      priceRange: p.priceRange,
      tags: p.tags.filter((t) => hasFacet(t, ["fits", "holds"])),
    }));

  return (
    // A newer save (another member of staff's, or a changed web address) starts the editor afresh.
    <ProductEditor
      key={`${product.slug}@${product.updatedAt}`}
      product={product}
      categories={categories}
      suggestions={tagSuggestions(all)}
      vocabulary={vocabulary}
      catalogue={catalogue}
      next={next}
    />
  );
}
