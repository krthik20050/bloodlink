import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUser, isSupabaseConfigured } from "./server";
export { hasSameOrigin } from "../request-security";

export type AuthenticatedUser = { id: string };

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  // ponytail: fail-closed — unconfigured env returns null (401 downstream), never a shared id.
  if (!isSupabaseConfigured()) return null;
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    const user = await getSupabaseUser().catch(() => null);
    return user ? { id: user.id } : null;
  }
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { data, error } = await createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.getUser(token);
  return error || !data.user ? null : { id: data.user.id };
}

export async function isAuthenticated(request: Request): Promise<boolean> {
  return Boolean(await getAuthenticatedUser(request));
}
