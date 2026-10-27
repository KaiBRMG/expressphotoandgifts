import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { notFound } from "next/navigation";
import { draftOf } from "@/lib/catalog/campaigns";
import { campaignContext, getCampaign, listCampaigns } from "@/lib/admin/campaigns";
import { codesSent } from "@/lib/campaignCodes";
import { CampaignEditor } from "../../../campaigns/CampaignEditor";

export async function generateMetadata({ params }: PageProps<"/admin/campaigns/[id]">): Promise<Metadata> {
  await requireAdmin();
  const c = await getCampaign((await params).id);
  return { title: c?.name || "Campaign" };
}

export default async function CampaignPage({ params }: PageProps<"/admin/campaigns/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [ctx, all, sent] = await Promise.all([campaignContext(), listCampaigns(), codesSent(id)]);
  const campaign = all.find((c) => c.id === id);
  if (!campaign) notFound();
  // Keyed on its version, so a fresh read after someone else's change starts the editor over on it.
  return <CampaignEditor key={campaign.updatedAt} campaign={campaign} initial={draftOf(campaign)} ctx={ctx} others={all.filter((c) => c.id !== id)} codesSent={sent} />;
}
