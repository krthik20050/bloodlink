import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUser, isSupabaseConfigured } from "./server";
export { hasSameOrigin } from "../request-security";

export type AuthenticatedUser = { id: string };

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  if (!isSupabaseConfigured()) return { id: "demo-user" };
  const authorization = request.headers.get("authorization");
  if (!authorization) return getSupabaseUser();
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const { data, error } = await createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.getUser(token);
  return error || !data.user ? null : { id: data.user.id };
}

export async function isAuthenticated(request: Request): Promise<boolean> {
  return Boolean(await getAuthenticatedUser(request));
}
