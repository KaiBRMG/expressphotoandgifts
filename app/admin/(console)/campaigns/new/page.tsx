import type { Metadata } from "next";
import { blankDraft, OFFS_FOR, type RuleKind } from "@/lib/catalog/campaigns";
import { campaignContext, listCampaigns } from "@/lib/admin/campaigns";
import { CampaignEditor } from "../../../campaigns/CampaignEditor";

export const metadata: Metadata = { title: "New campaign" };

/**
 * A new campaign, saved as a draft. `?kind=` starts it on a kind of deal;
 * `?product=a,b` on the products chosen in the list or the editor, as a
 * price deal unless another kind is named.
 */
export default async function NewCampaignPage({ searchParams }: PageProps<"/admin/campaigns/new">) {
  const [ctx, all, params] = await Promise.all([campaignContext(), listCampaigns(), searchParams]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const kind = (first(params.kind) in OFFS_FOR ? first(params.kind) : "price") as RuleKind;
  const known = new Set(ctx.catalogue.map((p) => p.slug));
  const picked = first(params.product).split(",").filter((s) => known.has(s));

  const draft = blankDraft(kind);
  const [rule] = draft.rules;
  if (picked.length && rule.kind !== "spend") {
    const target = { kind: "products" as const, items: picked.map((slug) => ({ slug, skus: null })) };
    draft.rules = [rule.kind === "pair" ? { ...rule, buy: target } : { ...rule, target }];
  }

  return <CampaignEditor campaign={null} initial={draft} ctx={ctx} others={all} />;
}
