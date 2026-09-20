import { getAdminMetrics } from "@/lib/supabase/admin-data";
import Shell from "./shell";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const metrics = await getAdminMetrics().catch(() => null);
  return (
    <Shell openCount={metrics?.requests.open ?? null} donorCount={metrics?.donors.total ?? null} attentionCount={metrics?.requests.open ?? null}>
      {children}
    </Shell>
  );
}
