import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/lib/admin/products";
import { ArrowLeft } from "@/app/site/icons";
import { NewProductForm } from "./NewProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await listCategories();
  return (
    <div className="page page--narrow">
      <Link href="/admin/products" className="back">
        <ArrowLeft size={18} />
        Products
      </Link>
      <header className="page__head">
        <div>
          <h1 className="page__title">New product</h1>
          <p className="page__lede">It starts hidden. To show it in the shop it needs a price, a main photo and a type.</p>
        </div>
      </header>
      <NewProductForm categories={categories.map((c) => ({ value: c.id, label: c.name }))} />
    </div>
  );
}
