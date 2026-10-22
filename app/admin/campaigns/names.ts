import type { Names } from "@/lib/catalog/campaigns";
import type { CampaignContext } from "@/lib/admin/campaigns";

/** Names for targets from the campaign pages' context, as `targetName` takes them. */
export function contextNames(c: Pick<CampaignContext, "categories" | "tags">): Names {
  const cats = new Map(c.categories.map((x) => [x.id, x.name]));
  const tags = new Map(c.tags.flatMap((g) => g.items.map((t) => [t.value, t.label])));
  return { category: (id) => cats.get(id) ?? id, tag: (t) => tags.get(t) ?? t };
}
