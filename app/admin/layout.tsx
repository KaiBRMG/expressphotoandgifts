import "@mantine/core/styles.css";
import "./admin.css";

import type { Metadata } from "next";
import { AdminProviders } from "./AdminProviders";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin" },
  robots: { index: false, follow: false },
};

/** The staff console. Mantine is loaded here only, so the shop never pays for it. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminProviders>{children}</AdminProviders>;
}
