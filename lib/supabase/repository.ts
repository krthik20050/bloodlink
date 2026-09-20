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
    sex: (row.sex as string | null) ?? null,
    ageYears: (row.age_years as number | null) ?? null,
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    hemoglobinGdl: row.hemoglobin_gdl == null ? null : Number(row.hemoglobin_gdl),
    systolicBpMmhg: (row.systolic_bp_mmhg as number | null) ?? null,
    diastolicBpMmhg: (row.diastolic_bp_mmhg as number | null) ?? null,
    pulseBpm: (row.pulse_bpm as number | null) ?? null,
    isPregnantNow: (row.is_pregnant_now as boolean | null) ?? null,
    lastPregnancyEndDate: (row.last_pregnancy_end_date as string | null) ?? null,
    isBreastfeedingNow: (row.is_breastfeeding_now as boolean | null) ?? null,
    illnessAntibiotics14d: (row.illness_antibiotics_14d as boolean | null) ?? null,
    tattooPiercing12m: (row.tattoo_piercing_12m as boolean | null) ?? null,
    alcohol24h: (row.alcohol_24h as boolean | null) ?? null,
    fitnessDeferUntil: (row.fitness_defer_until as string | null) ?? null,
    fitnessUnverified: Boolean(row.fitness_unverified ?? false),
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
    contact: String(row.contact ?? ""),
  };
}

function notificationFromRow(row: Record<string, unknown>, actionToken: string): Notification & { expiresAt: string | null } {
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
    // ponytail: expiry rides along; NULL (pre-0008 rows) = unknown, caller treats as non-expired
    expiresAt: (row.expires_at as string | null) ?? null,
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
    sex: input.sex ?? null,
    age_years: input.ageYears ?? null,
    weight_kg: input.weightKg ?? null,
    hemoglobin_gdl: input.hemoglobinGdl ?? null,
    systolic_bp_mmhg: input.systolicBpMmhg ?? null,
    diastolic_bp_mmhg: input.diastolicBpMmhg ?? null,
    pulse_bpm: input.pulseBpm ?? null,
    is_pregnant_now: input.isPregnantNow ?? null,
    last_pregnancy_end_date: input.lastPregnancyEndDate ?? null,
    is_breastfeeding_now: input.isBreastfeedingNow ?? null,
    illness_antibiotics_14d: input.illnessAntibiotics14d ?? null,
    tattoo_piercing_12m: input.tattooPiercing12m ?? null,
    alcohol_24h: input.alcohol24h ?? null,
    fitness_defer_until: input.fitnessDeferUntil ?? null,
    fitness_unverified: input.fitnessUnverified ?? false,
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

// ponytail: conditional *_confirmation/*_review -> *_creating transition; 0 rows = already claimed (double-tap), caller ignores
export async function claimTelegramConversation(chatId: string, fromState: string, toState: string, data: TelegramConversation["data"] = {}): Promise<boolean> {
  const { data: row, error } = await db().from("telegram_conversations").update({
    state: toState, data, updated_at: new Date().toISOString(),
  }).eq("chat_id", chatId).eq("state", fromState).select("chat_id").maybeSingle();
  if (error) throw error;
  return Boolean(row);
}

export async function clearTelegramConversation(chatId: string): Promise<void> {
  const { error } = await db().from("telegram_conversations").delete().eq("chat_id", chatId);
  if (error) throw error;
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
  fitness?: {
    sex?: string | null; ageYears?: number | null; weightKg?: number | null;
    hemoglobinGdl?: number | null; systolicBpMmhg?: number | null; diastolicBpMmhg?: number | null;
    pulseBpm?: number | null; isPregnantNow?: boolean | null; lastPregnancyEndDate?: string | null;
    isBreastfeedingNow?: boolean | null; illnessAntibiotics14d?: boolean | null;
    tattooPiercing12m?: boolean | null; alcohol24h?: boolean | null;
    fitnessDeferUntil?: string | null; fitnessUnverified?: boolean | null;
  };
}): Promise<Donor> {
  const existing = await db().from("donors").select("*").eq("telegram_chat_id", input.chatId).maybeSingle();
  if (existing.error) throw existing.error;
  const fit = input.fitness ?? {};
  const base = {
    name: input.name, contact: input.contact, blood_group: input.bloodGroup,
    latitude: input.latitude, longitude: input.longitude,
    last_donation_date: input.lastDonationDate, availability_status: "AVAILABLE",
    notification_consent: true, telegram_chat_id: input.chatId,
  };
  const full = {
    ...base,
    sex: fit.sex ?? null, age_years: fit.ageYears ?? null, weight_kg: fit.weightKg ?? null,
    hemoglobin_gdl: fit.hemoglobinGdl ?? null, systolic_bp_mmhg: fit.systolicBpMmhg ?? null,
    diastolic_bp_mmhg: fit.diastolicBpMmhg ?? null, pulse_bpm: fit.pulseBpm ?? null,
    is_pregnant_now: fit.isPregnantNow ?? null, last_pregnancy_end_date: fit.lastPregnancyEndDate ?? null,
    is_breastfeeding_now: fit.isBreastfeedingNow ?? null, illness_antibiotics_14d: fit.illnessAntibiotics14d ?? null,
    tattoo_piercing_12m: fit.tattooPiercing12m ?? null, alcohol_24h: fit.alcohol24h ?? null,
    fitness_defer_until: fit.fitnessDeferUntil ?? null, fitness_unverified: fit.fitnessUnverified ?? false,
  };
  const save = (values: Record<string, unknown>) => existing.data
    ? db().from("donors").update(values).eq("id", (existing.data as { id: string }).id).select("*").single()
    : db().from("donors").insert(values).select("*").single();
  let result = await save(full);
  if (result.error && /column|42703|42P01|PGRST204/i.test(result.error.message)) {
    // ponytail: pre-fitness DBs lack the columns; the core profile still registers
    console.error(JSON.stringify({ event: "telegram_donor_fitness_skipped", error: result.error.message }));
    result = await save(base);
  }
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
    .update({ status: "CANCELLED", matched_donor_id: null })
    .eq("id", requestId)
    .eq("requester_id", requesterId)
    .in("status", ["OPEN", "MATCHED"])
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  // ponytail: release by request id so a newer donor lock is never clobbered
  const released = await db().from("donors").update({ active_match_request_id: null }).eq("active_match_request_id", requestId);
  if (released.error) throw released.error;
  await expirePendingNotifications(requestId);
  return true;
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
    contact: input.contact,
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
  // ponytail: unique(request_id, donor_id) blocks FAILED/EXPIRED retry — clear only terminal rows; PENDING/ACCEPTED/DECLINED still block
  const cleared = await db().from("notifications").delete().eq("request_id", input.requestId).eq("donor_id", input.donorId).in("response", ["FAILED", "EXPIRED"]);
  if (cleared.error) throw cleared.error;
  const { data, error } = await db().from("notifications").insert({
    request_id: input.requestId,
    donor_id: input.donorId,
    wave_number: input.waveNumber,
    response: input.response,
    sent_at: input.sentAt,
    // ponytail: 72h token TTL, matches 0008 default so app + DB agree
    expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
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

export async function expirePendingNotifications(requestId: string, exceptId?: string): Promise<void> {
  let query = db().from("notifications").update({ response: "EXPIRED" }).eq("request_id", requestId).eq("response", "PENDING");
  if (exceptId) query = query.neq("id", exceptId);
  const { error } = await query;
  if (error) throw error;
}

// ponytail: atomic request claim — only one accept wins; loser sees no row
export async function claimRequest(requestId: string, donorId: string): Promise<boolean> {
  const { data, error } = await db().from("blood_requests").update({
    status: "MATCHED",
    matched_donor_id: donorId,
  }).eq("id", requestId).eq("status", "OPEN").select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// ponytail: conditional release — never reopens a request cancelled after our claim
export async function releaseRequestClaim(requestId: string, donorId: string): Promise<void> {
  const { error } = await db().from("blood_requests").update({
    status: "OPEN",
    matched_donor_id: null,
  }).eq("id", requestId).eq("status", "MATCHED").eq("matched_donor_id", donorId);
  if (error) throw error;
}

export async function updateRequest(id: string, patch: Partial<Pick<BloodRequest, "status" | "matchedDonorId">>): Promise<void> {
  // ponytail: undefined = absent, explicit null clears the lock
  const values: Record<string, string | null> = {};
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.matchedDonorId !== undefined) values.matched_donor_id = patch.matchedDonorId;
  if (Object.keys(values).length === 0) return;
  const { error } = await db().from("blood_requests").update(values).eq("id", id);
  if (error) throw error;
}

export async function updateDonor(id: string, patch: Partial<Pick<Donor, "activeMatchRequestId" | "lastNotifiedAt" | "notificationConsent" | "availability" | "name" | "contact" | "bloodGroup" | "location" | "lastDonationDate" | "sex" | "ageYears" | "weightKg" | "hemoglobinGdl" | "systolicBpMmhg" | "diastolicBpMmhg" | "pulseBpm" | "isPregnantNow" | "lastPregnancyEndDate" | "isBreastfeedingNow" | "illnessAntibiotics14d" | "tattooPiercing12m" | "alcohol24h" | "fitnessDeferUntil" | "fitnessUnverified">>): Promise<void> {
  // ponytail: undefined = absent, explicit null clears the lock
  const values: Record<string, string | number | boolean | null> = {};
  if (patch.activeMatchRequestId !== undefined) values.active_match_request_id = patch.activeMatchRequestId;
  if (patch.lastNotifiedAt !== undefined) values.last_notified_at = patch.lastNotifiedAt;
  if (patch.notificationConsent !== undefined) values.notification_consent = patch.notificationConsent;
  if (patch.availability !== undefined) values.availability_status = patch.availability;
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.contact !== undefined) values.contact = patch.contact;
  if (patch.bloodGroup !== undefined) values.blood_group = patch.bloodGroup;
  if (patch.location !== undefined) {
    values.latitude = patch.location.latitude;
    values.longitude = patch.location.longitude;
  }
  if (patch.lastDonationDate !== undefined) values.last_donation_date = patch.lastDonationDate;
  if (patch.sex !== undefined) values.sex = patch.sex;
  if (patch.ageYears !== undefined) values.age_years = patch.ageYears;
  if (patch.weightKg !== undefined) values.weight_kg = patch.weightKg;
  if (patch.hemoglobinGdl !== undefined) values.hemoglobin_gdl = patch.hemoglobinGdl;
  if (patch.systolicBpMmhg !== undefined) values.systolic_bp_mmhg = patch.systolicBpMmhg;
  if (patch.diastolicBpMmhg !== undefined) values.diastolic_bp_mmhg = patch.diastolicBpMmhg;
  if (patch.pulseBpm !== undefined) values.pulse_bpm = patch.pulseBpm;
  if (patch.isPregnantNow !== undefined) values.is_pregnant_now = patch.isPregnantNow;
  if (patch.lastPregnancyEndDate !== undefined) values.last_pregnancy_end_date = patch.lastPregnancyEndDate;
  if (patch.isBreastfeedingNow !== undefined) values.is_breastfeeding_now = patch.isBreastfeedingNow;
  if (patch.illnessAntibiotics14d !== undefined) values.illness_antibiotics_14d = patch.illnessAntibiotics14d;
  if (patch.tattooPiercing12m !== undefined) values.tattoo_piercing_12m = patch.tattooPiercing12m;
  if (patch.alcohol24h !== undefined) values.alcohol_24h = patch.alcohol24h;
  if (patch.fitnessDeferUntil !== undefined) values.fitness_defer_until = patch.fitnessDeferUntil;
  if (patch.fitnessUnverified !== undefined) values.fitness_unverified = patch.fitnessUnverified;
  if (Object.keys(values).length === 0) return;
  const { error } = await db().from("donors").update(values).eq("id", id);
  if (error) throw error;
}

export interface DonationRecord { requestId: string; date: string; hospital: string; bloodGroup: string; units: number }
// ponytail: accepted matches = completed donations; two cheap queries, no join syntax risk
export async function listDonationsByDonor(donorId: string): Promise<DonationRecord[]> {
  const { data: matches, error } = await db().from("matches").select("request_id, created_at").eq("donor_id", donorId).order("created_at", { ascending: false });
  if (error) throw error;
  if (!matches || matches.length === 0) return [];
  const ids = matches.map((m) => String((m as Record<string, unknown>).request_id));
  const { data: requests, error: reqError } = await db().from("blood_requests").select("id, hospital, blood_group, units_required, created_at").in("id", ids);
  if (reqError) throw reqError;
  const byId = new Map((requests ?? []).map((r) => [String((r as Record<string, unknown>).id), r as Record<string, unknown>]));
  return ids.map((id, i) => {
    const r = byId.get(id);
    return {
      requestId: id,
      date: String((matches[i] as Record<string, unknown>).created_at),
      hospital: r ? String(r.hospital) : "—",
      bloodGroup: r ? String(r.blood_group) : "—",
      units: r ? Number(r.units_required) : 0,
    };
  });
}

// ponytail: conditional donor claim — same donor matching 2 requests concurrently; loser sees no row
export async function claimDonor(donorId: string, requestId: string): Promise<boolean> {
  const { data, error } = await db().from("donors").update({ active_match_request_id: requestId })
    .eq("id", donorId).is("active_match_request_id", null).select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data);
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

// ponytail: requester sees donor contact only via a MATCHED row pairing them; else null
export async function getDonorContactForRequester(donorId: string, requesterId: string): Promise<{ name: string; contact: string } | null> {
  const { data: match, error: matchError } = await db().from("blood_requests").select("id")
    .eq("requester_id", requesterId).eq("matched_donor_id", donorId).eq("status", "MATCHED").maybeSingle();
  if (matchError) throw matchError;
  if (!match) return null;
  const { data: donor, error: donorError } = await db().from("donors").select("name,contact").eq("id", donorId).maybeSingle();
  if (donorError) throw donorError;
  if (!donor) return null;
  return { name: String(donor.name), contact: String(donor.contact) };
}
