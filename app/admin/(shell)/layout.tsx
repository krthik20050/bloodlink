import { getAdminMetrics } from "@/lib/supabase/admin-data";
import AdminNav from "../nav";
import AdminTopbar from "../topbar";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const metrics = await getAdminMetrics().catch(() => null);
  return (
    <div className="ax-app">
      <AdminNav openCount={metrics?.requests.open ?? null} donorCount={metrics?.donors.total ?? null} />
      <div className="ax-main">
        <AdminTopbar attentionCount={metrics?.requests.open ?? null} />
        <div className="ax-content">{children}</div>
      </div>
    </div>
  );
}
