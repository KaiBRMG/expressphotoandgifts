import { redirect } from "next/navigation";

/** Products is the console's only page for now. */
export default function ConsoleHome() {
  redirect("/admin/products");
}
