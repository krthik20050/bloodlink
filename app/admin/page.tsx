import { redirect } from "next/navigation";
import { getAdminMetrics, listAdminDonors, listAdminNotifications, listAdminRequests } from "@/lib/supabase/admin-data";
import { getSupabaseUser } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/admin";
import { hasDemoAdminSession } from "@/lib/demo-admin";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const user = await getSupabaseUser().catch(() => null);
  const demoAdmin = await hasDemoAdminSession();
  if (!user && !demoAdmin) redirect("/auth");
  if (!demoAdmin && (!user || !(await isAdminUser(user.id)))) redirect("/");

  const [metrics, requests, donors, notifications] = await Promise.all([
    getAdminMetrics(),
    listAdminRequests(),
    listAdminDonors(),
    listAdminNotifications(),
  ]);

  return <AdminDashboard initial={{ metrics, requests, donors, notifications }} />;
}
