import "server-only";
import { getSupabaseAdmin } from "./server";
import { summarizeAdminMetrics, type AdminMetrics } from "./admin-metrics";
export { summarizeAdminMetrics } from "./admin-metrics";
export type { AdminMetrics } from "./admin-metrics";
type RequestRow = { status: string };
type DonorRow = { availability_status: string; notification_consent: boolean; telegram_connected: boolean };
type NotificationRow = { response: string };
type MatchRow = { id: string };

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const db = getSupabaseAdmin();
  const [requests, donors, notifications, matches] = await Promise.all([
    db.from("blood_requests").select("status"),
    db.from("donors").select("availability_status, notification_consent, telegram_chat_id"),
    db.from("notifications").select("response"),
    db.from("matches").select("id"),
  ]);
  for (const result of [requests, donors, notifications, matches]) if (result.error) throw result.error;
  return summarizeAdminMetrics(
    (requests.data ?? []) as RequestRow[],
    ((donors.data ?? []) as { availability_status: string; notification_consent: boolean; telegram_chat_id: string | null }[])
      .map(row => ({ ...row, telegram_connected: Boolean(row.telegram_chat_id) })),
    (notifications.data ?? []) as NotificationRow[],
    (matches.data ?? []) as MatchRow[],
  );
}

export async function listAdminRequests() {
  const { data, error } = await getSupabaseAdmin()
    .from("blood_requests")
    .select("id, blood_group, units_required, hospital, urgency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listAdminDonors() {
  const { data, error } = await getSupabaseAdmin()
    .from("donors")
    .select("id, name, blood_group, availability_status, notification_consent, telegram_chat_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  // ponytail: strip raw Telegram IDs at the boundary; expose only a boolean.
  return (data ?? []).map(row => ({ ...row, telegram_chat_id: undefined, telegram_connected: Boolean(row.telegram_chat_id) }));
}

export async function listAdminMatches() {
  const { data, error } = await getSupabaseAdmin()
    .from("matches")
    .select("id, request_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listAdminNotifications() {
  const { data, error } = await getSupabaseAdmin()
    .from("notifications")
    .select("id, wave_number, response, sent_at, responded_at")
    .order("sent_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
