import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { BloodRequest, Donor, Notification } from "@/lib/domain";
import { getSupabaseAdmin } from "./server";

const db = () => getSupabaseAdmin();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function donorFromRow(row: Record<string, unknown>): Donor {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? null,
    name: String(row.name),
    bloodGroup: row.blood_group as Donor["bloodGroup"],
    location: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    lastDonationDate: (row.last_donation_date as string | null) ?? null,
    availability: row.availability_status as Donor["availability"],
    notificationConsent: Boolean(row.notification_consent),
    pausedUntil: (row.notification_paused_until as string | null) ?? null,
    lastNotifiedAt: (row.last_notified_at as string | null) ?? null,
    telegramChatId: (row.telegram_chat_id as string | null) ?? null,
    telegramLinkTokenExpiresAt: (row.telegram_link_token_expires_at as string | null) ?? null,
    contact: String(row.contact),
    activeMatchRequestId: (row.active_match_request_id as string | null) ?? null,
  };
}

function requestFromRow(row: Record<string, unknown>): BloodRequest {
  return {
    id: String(row.id),
    requesterId: String(row.requester_id),
    bloodGroup: row.blood_group as BloodRequest["bloodGroup"],
    unitsRequired: Number(row.units_required),
    hospital: String(row.hospital),
    location: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    urgency: row.urgency as BloodRequest["urgency"],
    status: row.status as BloodRequest["status"],
    createdAt: String(row.created_at),
    matchedDonorId: (row.matched_donor_id as string | null) ?? null,
  };
}

function notificationFromRow(row: Record<string, unknown>, actionToken: string): Notification {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    donorId: String(row.donor_id),
    waveNumber: Number(row.wave_number),
    response: row.response as Notification["response"],
    sentAt: String(row.sent_at),
    respondedAt: (row.responded_at as string | null) ?? null,
    actionTokenHash: String(row.action_token_hash),
    actionToken,
  };
}

export async function listDonors(): Promise<Donor[]> {
  const { data, error } = await db().from("donors").select("*");
  if (error) throw error;
  return (data ?? []).map(row => donorFromRow(row));
}

export async function createDonor(input: Omit<Donor, "id" | "activeMatchRequestId">): Promise<Donor> {
  const { data, error } = await db().from("donors").insert({
    user_id: input.userId,
    name: input.name,
    blood_group: input.bloodGroup,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    last_donation_date: input.lastDonationDate,
    availability_status: input.availability,
    notification_consent: input.notificationConsent,
    telegram_chat_id: input.telegramChatId ?? null,
    contact: input.contact,
  }).select("*").single();
  if (error) throw error;
  return donorFromRow(data);
}

export async function createTelegramLink(donorId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { error } = await db().from("donors").update({
    telegram_link_token_hash: hashToken(token),
    telegram_link_token_expires_at: expiresAt,
  }).eq("id", donorId);
  if (error) throw error;
  return token;
}

export async function linkTelegramDonor(token: string, chatId: string): Promise<Donor | null> {
  const { data, error } = await db().from("donors").select("*")
    .eq("telegram_link_token_hash", hashToken(token))
    .gt("telegram_link_token_expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const updated = await db().from("donors").update({
    telegram_chat_id: chatId,
    telegram_link_token_hash: null,
    telegram_link_token_expires_at: null,
  }).eq("id", data.id).select("*").single();
  if (updated.error) throw updated.error;
  return donorFromRow(updated.data);
}

export async function disconnectTelegramDonor(chatId: string): Promise<Donor | null> {
  const { data, error } = await db().from("donors").update({ telegram_chat_id: null })
    .eq("telegram_chat_id", chatId).select("*").maybeSingle();
  if (error) throw error;
  return data ? donorFromRow(data) : null;
}

export type TelegramConversation = {
  chatId: string;
  state: string;
  data: Record<string, string | number | boolean | null>;
};

export async function getTelegramConversation(chatId: string): Promise<TelegramConversation | null> {
  const { data, error } = await db().from("telegram_conversations").select("*").eq("chat_id", chatId).maybeSingle();
  if (error) throw error;
  return data ? { chatId, state: String(data.state), data: (data.data ?? {}) as TelegramConversation["data"] } : null;
}

export async function saveTelegramConversation(chatId: string, state: string, data: TelegramConversation["data"] = {}): Promise<void> {
  const { error } = await db().from("telegram_conversations").upsert({
    chat_id: chatId, state, data, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function clearTelegramConversation(chatId: string): Promise<void> {
  const { error } = await db().from("telegram_conversations").delete().eq("chat_id", chatId);
  if (error) throw error;
}

// ponytail: atomic compare-and-swap on conversation state — a retried/double-tapped
// confirm only wins once; losers see 0 rows and skip the create
export async function claimTelegramConversation(chatId: string, fromState: string, toState: string, data: TelegramConversation["data"] = {}): Promise<boolean> {
  const { data: rows, error } = await db().from("telegram_conversations").update({
    state: toState, data, updated_at: new Date().toISOString(),
  }).eq("chat_id", chatId).eq("state", fromState).select("chat_id");
  if (error) throw error;
  return (rows?.length ?? 0) > 0;
}

export async function getOrCreateTelegramRequester(chatId: string): Promise<string> {
  const existing = await db().from("telegram_requesters").select("requester_id").eq("chat_id", chatId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return String(existing.data.requester_id);
  const created = await db().from("telegram_requesters").insert({ chat_id: chatId }).select("requester_id").single();
  if (created.error) throw created.error;
  return String(created.data.requester_id);
}

// ponytail: patient name/contact ride along on the requester row so no collected field is dropped
export async function updateTelegramRequester(chatId: string, input: { name: string; contact: string }): Promise<void> {
  const { error } = await db().from("telegram_requesters").update({
    contact_name: input.name, contact_detail: input.contact,
  }).eq("chat_id", chatId);
  if (error) throw error;
}

export async function createTelegramDonor(input: {
  chatId: string;
  name: string;
  contact: string;
  bloodGroup: Donor["bloodGroup"];
  latitude: number;
  longitude: number;
  lastDonationDate: string | null;
}): Promise<Donor> {
  const existing = await db().from("donors").select("*").eq("telegram_chat_id", input.chatId).maybeSingle();
  if (existing.error) throw existing.error;
  const values = {
    name: input.name, contact: input.contact, blood_group: input.bloodGroup,
    latitude: input.latitude, longitude: input.longitude,
    last_donation_date: input.lastDonationDate, availability_status: "AVAILABLE",
    notification_consent: true, telegram_chat_id: input.chatId,
  };
  const result = existing.data
    ? await db().from("donors").update(values).eq("id", existing.data.id).select("*").single()
    : await db().from("donors").insert(values).select("*").single();
  if (result.error) throw result.error;
  return donorFromRow(result.data);
}

export async function listRequests(): Promise<BloodRequest[]> {
  const { data, error } = await db().from("blood_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => requestFromRow(row));
}

export async function listDonorsByUser(userId: string): Promise<Donor[]> {
  const { data, error } = await db().from("donors").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map(row => donorFromRow(row));
}

export async function listRequestsByRequester(userId: string): Promise<BloodRequest[]> {
  const { data, error } = await db().from("blood_requests").select("*").eq("requester_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => requestFromRow(row));
}

export async function listRequestsByRequesterId(requesterId: string): Promise<BloodRequest[]> {
  return listRequestsByRequester(requesterId);
}

export async function cancelRequestForRequester(requestId: string, requesterId: string): Promise<boolean> {
  const { data, error } = await db().from("blood_requests")
    .update({ status: "CANCELLED" })
    .eq("id", requestId)
    .eq("requester_id", requesterId)
    .in("status", ["OPEN", "MATCHED"])
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getRequest(id: string): Promise<BloodRequest | null> {
  const { data, error } = await db().from("blood_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? requestFromRow(data) : null;
}

export async function createRequest(input: Omit<BloodRequest, "id" | "matchedDonorId">): Promise<BloodRequest> {
  const { data, error } = await db().from("blood_requests").insert({
    requester_id: input.requesterId,
    blood_group: input.bloodGroup,
    units_required: input.unitsRequired,
    hospital: input.hospital,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    urgency: input.urgency,
    status: input.status,
  }).select("*").single();
  if (error) throw error;
  return requestFromRow(data);
}

export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await db().from("notifications").select("*");
  if (error) throw error;
  return (data ?? []).map(row => notificationFromRow(row, ""));
}

export async function createNotification(input: Omit<Notification, "id" | "actionTokenHash"> & { actionToken: string }): Promise<Notification> {
  const { data, error } = await db().from("notifications").insert({
    request_id: input.requestId,
    donor_id: input.donorId,
    wave_number: input.waveNumber,
    response: input.response,
    sent_at: input.sentAt,
    action_token_hash: hashToken(input.actionToken),
  }).select("*").single();
  if (error) throw error;
  return notificationFromRow(data, input.actionToken);
}

export async function getNotificationByToken(actionToken: string): Promise<Notification | null> {
  const { data, error } = await db().from("notifications").select("*").eq("action_token_hash", hashToken(actionToken)).maybeSingle();
  if (error) throw error;
  return data ? notificationFromRow(data, actionToken) : null;
}

export async function updateNotification(id: string, patch: Partial<Pick<Notification, "response" | "respondedAt">>): Promise<void> {
  const { error } = await db().from("notifications").update({
    ...(patch.response ? { response: patch.response } : {}),
    ...(patch.respondedAt ? { responded_at: patch.respondedAt } : {}),
  }).eq("id", id);
  if (error) throw error;
}

export async function claimNotification(id: string, response: Exclude<Notification["response"], "PENDING">, respondedAt: string): Promise<boolean> {
  const { data, error } = await db().from("notifications").update({
    response,
    responded_at: respondedAt,
  }).eq("id", id).eq("response", "PENDING").select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function expirePendingNotifications(requestId: string, exceptId: string): Promise<void> {
  const { error } = await db().from("notifications").update({ response: "EXPIRED" }).eq("request_id", requestId).eq("response", "PENDING").neq("id", exceptId);
  if (error) throw error;
}

export async function updateRequest(id: string, patch: Partial<Pick<BloodRequest, "status" | "matchedDonorId">>): Promise<void> {
  const { error } = await db().from("blood_requests").update({
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.matchedDonorId ? { matched_donor_id: patch.matchedDonorId } : {}),
  }).eq("id", id);
  if (error) throw error;
}

export async function updateDonor(id: string, patch: Partial<Pick<Donor, "activeMatchRequestId" | "lastNotifiedAt">>): Promise<void> {
  const { error } = await db().from("donors").update({
    ...(patch.activeMatchRequestId ? { active_match_request_id: patch.activeMatchRequestId } : {}),
    ...(patch.lastNotifiedAt ? { last_notified_at: patch.lastNotifiedAt } : {}),
  }).eq("id", id);
  if (error) throw error;
}

export async function createMatch(requestId: string, donorId: string): Promise<void> {
  const { error } = await db().from("matches").insert({
    request_id: requestId,
    donor_id: donorId,
    contact_exchange_enabled_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getRequestAndDonor(requestId: string, donorId: string): Promise<{ request: BloodRequest | null; donor: Donor | null }> {
  const [request, donor] = await Promise.all([
    getRequest(requestId),
    db().from("donors").select("*").eq("id", donorId).maybeSingle(),
  ]);
  if (donor.error) throw donor.error;
  return { request, donor: donor.data ? donorFromRow(donor.data) : null };
}
