import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductForEdit, listCategories, listProducts, tagSuggestions } from "@/lib/admin/products";
import { ProductEditor } from "@/app/admin/editor/ProductEditor";

export async function generateMetadata({ params }: PageProps<"/admin/products/[slug]">): Promise<Metadata> {
  const product = await getProductForEdit((await params).slug);
  return { title: product?.name ?? "Product" };
}

export default async function EditProductPage({ params }: PageProps<"/admin/products/[slug]">) {
  const { slug } = await params;
  const [product, categories, all] = await Promise.all([getProductForEdit(slug), listCategories(), listProducts()]);
  if (!product) notFound();

  return (
    // A newer save (another member of staff's, or a changed web address) starts the editor afresh.
    <ProductEditor
      key={`${product.slug}@${product.updatedAt}`}
      product={product}
      categories={categories}
      suggestions={tagSuggestions(all)}
    />
  );
}
