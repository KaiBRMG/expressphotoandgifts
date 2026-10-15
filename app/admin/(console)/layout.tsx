import { requireAdmin } from "@/lib/admin/auth";
import { Sidebar } from "./Sidebar";

/** Every console page: signed-in staff only, beside the sidebar. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="console">
      <Sidebar email={admin.email} />
      <main id="main" className="console__main">
        {children}
      </main>
    </div>
  );
}
