import type { AuthenticatedUser } from "./auth";

export function hasAdminAccess(
  user: AuthenticatedUser | null,
  record: { user_id: string; is_active: boolean } | null,
): boolean {
  return Boolean(user && record && record.user_id === user.id && record.is_active);
}
