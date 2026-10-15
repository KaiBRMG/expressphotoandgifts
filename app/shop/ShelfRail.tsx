import Link from "next/link";

import { shelfHref } from "@/lib/catalog/listing";
import { getRail } from "./shelves";

/**
 * Every shelf with something on it, each with its count. The storefront sets
 * it as a strip of pills under the sign (`shelves`); the catalogue as the rail
 * beside the products, marking the shelf it is on (`rail`).
 */
export async function ShelfRail({
  variant,
  current,
}: {
  variant: "shelves" | "rail";
  current?: string;
}) {
  const rail = await getRail();
  return (
    <nav
      className={variant === "shelves" ? "shelves shell" : "rail"}
      aria-label={variant === "shelves" ? "Shop by category" : "Categories"}
    >
      <ul>
        {rail.map((r) => (
          <li key={r.slug}>
            <Link
              href={shelfHref(r.slug)}
              aria-current={r.slug === current ? "page" : undefined}
            >
              <span>{r.name}</span>
              <span className={`${variant}__count`}>{r.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
