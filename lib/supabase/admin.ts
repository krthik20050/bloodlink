import "server-only";
import { getAuthenticatedUser, type AuthenticatedUser } from "./auth";
import { getSupabaseAdmin, isSupabaseConfigured } from "./server";
import { hasAdminAccess } from "./admin-policy";
import { hasDemoAdminSession } from "@/lib/demo-admin";

export type AdminRole = "ADMIN" | "OPS";
export { hasAdminAccess } from "./admin-policy";

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { data, error } = await getSupabaseAdmin()
    .from("admin_users")
    .select("user_id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return hasAdminAccess({ id: userId }, data);
}

export async function getAdminUser(request: Request): Promise<AuthenticatedUser | null> {
  if (await hasDemoAdminSession(request)) return { id: "demo-admin" };
  if (!isSupabaseConfigured()) return null;
  const user = await getAuthenticatedUser(request);
  if (!user || !(await isAdminUser(user.id))) return null;
  return user;
}
