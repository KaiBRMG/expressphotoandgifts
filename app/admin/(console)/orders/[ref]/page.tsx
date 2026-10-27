import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { notFound } from "next/navigation";
import { getOrderForAdmin, nextOrder } from "@/lib/admin/orders";
import { printSpecs } from "@/lib/admin/printSpecs";
import { shippingBoxes } from "@/lib/settings";
import { OrderView } from "./OrderView";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[ref]">): Promise<Metadata> {
  return { title: `Order ${(await params).ref}` };
}

/** One order, read fresh, drawn by `OrderView`. */
export default async function OrderPage({ params }: PageProps<"/admin/orders/[ref]">) {
  await requireAdmin();
  const { ref } = await params;
  const [found, boxes, next] = await Promise.all([getOrderForAdmin(ref), shippingBoxes(), nextOrder(ref)]);
  if (!found) notFound();
  return <OrderView order={found.order} notices={found.notices} boxes={boxes} specs={await printSpecs(found.order)} next={found.order.status === "paid" ? next : null} />;
}
