import type { Metadata } from "next";
import { listCategories } from "@/lib/admin/products";
import { BackToProducts } from "../BackToProducts";
import { NewProductForm } from "./NewProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await listCategories();
  return (
    <div className="page page--narrow">
      <BackToProducts />
      <header className="page__head">
        <div>
          <h1 className="page__title">New product</h1>
          <p className="page__lede">It starts hidden, so shoppers can’t see it while you set it up. To go in the shop it needs a price, a main photo and a type: the button it’s listed under on its shelf, such as Mugs on Photo gifts.</p>
        </div>
      </header>
      <NewProductForm categories={categories.map((c) => ({ value: c.id, label: c.name }))} />
    </div>
  );
}
