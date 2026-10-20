"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowLeft } from "@/app/site/icons";

/** Where the list keeps its last view (search, filters, sort) for this tab. */
export const LIST_KEY = "admin.products.view";

const lastView = () => {
  try {
    return sessionStorage.getItem(LIST_KEY) ?? "";
  } catch {
    return "";
  }
};

/** "Products", back to the list as it was left rather than to its defaults. */
export function BackToProducts() {
  // Read once the page is in the browser; the server's render links to the plain list.
  const search = useSyncExternalStore(noSubscription, lastView, () => "");

  return (
    <Link href={search ? `/admin/products?${search}` : "/admin/products"} className="back">
      <ArrowLeft size={18} />
      Products
    </Link>
  );
}

const noSubscription = () => () => {};
