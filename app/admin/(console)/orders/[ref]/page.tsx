import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderForAdmin } from "@/lib/admin/orders";
import { printSpecs } from "@/lib/admin/printSpecs";
import { shippingBoxes } from "@/lib/settings";
import { OrderView } from "./OrderView";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[ref]">): Promise<Metadata> {
  return { title: `Order ${(await params).ref}` };
}

/** One order, read fresh, drawn by `OrderView`. */
export default async function OrderPage({ params }: PageProps<"/admin/orders/[ref]">) {
  const { ref } = await params;
  const [found, boxes] = await Promise.all([getOrderForAdmin(ref), shippingBoxes()]);
  if (!found) notFound();
  return <OrderView order={found.order} notices={found.notices} boxes={boxes} specs={await printSpecs(found.order)} />;
}
