import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/admin";
import { hasDemoAdminSession } from "@/lib/demo-admin";

// ponytail: single guard shared by every /admin view.
export async function requireAdmin() {
  const user = await getSupabaseUser().catch(() => null);
  const demoAdmin = await hasDemoAdminSession();
  if (!user && !demoAdmin) redirect("/auth");
  if (!demoAdmin && (!user || !(await isAdminUser(user.id)))) redirect("/");
}
