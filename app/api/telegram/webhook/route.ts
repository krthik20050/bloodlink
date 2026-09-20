import { NextResponse } from "next/server";
import { bloodGroups, type BloodGroup } from "@/lib/domain";
import { formatTelegramRequest, isTelegramBloodGroup, parseTelegramHospital, parseTelegramUnits, parseTelegramUrgency } from "@/lib/telegram-request";
import { evaluateFitness, type FitnessFields } from "@/lib/eligibility";
import { formatDisplayDate, normalizeCalendarDate, normalizeTelegramDonationDate } from "@/lib/telegram-registration";
import { acceptNotification, declineNotification } from "@/lib/match-lifecycle";
import { matchDonors } from "@/lib/matching";
import { queueNotifications } from "@/lib/notifications";
import {
  clearTelegramConversation,
  cancelRequestForRequester,
  claimTelegramConversation,
  createRequest,
  createTelegramDonor,
  disconnectTelegramDonor,
  getOrCreateTelegramRequester,
  getRequest,
  getTelegramConversation,
  linkTelegramDonor,
  listRequestsByRequesterId,
  listDonors,
  listNotifications,
  saveTelegramConversation,
  updateTelegramRequester,
} from "@/lib/supabase/repository";
import {
  answerCallbackQuery,
  configureTelegramBot,
  dateConfirmKeyboard,
  donationCalendarKeyboard,
  donatedKeyboard,
  donorEditMenuKeyboard,
  fitSexKeyboard,
  fitYesNoKeyboard,
  donorReviewKeyboard,
  editTelegramCalendar,
  editTelegramMessage,
  sendTelegramMessage,
  sendTelegramReplyKeyboard,
  bloodGroupKeyboard,
  consentKeyboard,
  telegramEntryKeyboard,
  requesterConfirmationKeyboard,
  requesterEditMenuKeyboard,
  requesterUrgencyKeyboard,
  unitsKeyboard,
} from "@/lib/telegram";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    location?: { latitude: number; longitude: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
};

const commands = [
  { command: "start", description: "Open the BloodLink menu" },
  { command: "donate", description: "Register as a blood donor" },
  { command: "request", description: "Request blood" },
  { command: "need_blood", description: "Request blood" },
  { command: "help", description: "Show available actions" },
  { command: "status", description: "Show your donor status" },
  { command: "cancel_request", description: "Cancel one of your blood requests" },
  { command: "cancel", description: "Cancel the current flow" },
  { command: "disconnect", description: "Disconnect this Telegram chat" },
];
const helpText = "Use /start to open the menu.\n\nDonate: register directly in Telegram.\n/request: create a blood request here.\n/status: show your donor status and blood requests.\n/cancel: stop the current flow.\n/disconnect: remove this chat from your donor profile.";

// ponytail: Supabase throws plain objects, not Errors — String() hides them as [object Object]
function errText(error: unknown): string {
  if (error instanceof Error) return error.message;
  try { return JSON.stringify(error); } catch { return String(error); }
}

function command(text: string): { name: string; payload?: string } | null {
  const match = text.trim().match(/^\/([a-z]+)(?:@[a-z0-9_]+)?(?:\s+(.+))?$/i);
  return match ? { name: match[1].toLowerCase(), payload: match[2]?.trim().slice(0, 64) } : null;
}

async function donorStatus(chatId: string): Promise<string> {
  const donor = (await listDonors()).find(item => item.telegramChatId === chatId);
  if (!donor) return "No donor profile is linked to this Telegram chat yet. Tap “I want to donate” to register here.";
  if (donor.activeMatchRequestId) {
    const request = await getRequest(donor.activeMatchRequestId);
    return request ? `Your donor profile is matched to ${request.hospital} for ${request.bloodGroup}. Please follow the blood bank's instructions.` : "Your donor profile has an active match.";
  }
  return `Your donor profile is connected and ${donor.availability === "AVAILABLE" ? "available for eligible requests" : "paused"}.`;
}

async function startDonorFlow(chatId: string) {
  await saveTelegramConversation(chatId, "donor_name");
  await sendTelegramMessage(chatId, "🩸 Let’s register you as a donor.\n\nWhat is your full name?");
}

async function startRequesterFlow(chatId: string) {
  await saveTelegramConversation(chatId, "request_name");
  await sendTelegramMessage(chatId, "🩸 Let’s create a blood request.\n\nWhat is the patient’s name?");
}

function requestConfirmationText(data: Record<string, string | number | boolean | null>): string {
  return `🩸 Please confirm your blood request:\n\n• Patient: ${String(data["name"] ?? "—")}\n• Contact: ${String(data["contact"] ?? "—")}\n• Blood group: ${String(data["bloodGroup"] ?? "—")}\n• Units: ${String(data["units"] ?? "—")}\n• Urgency: ${String(data["urgency"] ?? "—")}\n• Hospital: ${String(data["hospital"] ?? "—")}\n• Location: ${data["latitude"] ?? "—"}, ${data["longitude"] ?? "—"}\n\nTap Create request to send, Edit to change an answer, or Cancel.`;
}

// ponytail: Telegram locations are usually valid, but forged updates aren't — same ranges as the web zod schema
function validCoords(value: unknown): value is { latitude: number; longitude: number } {
  if (typeof value !== "object" || value === null) return false;
  const { latitude, longitude } = value as { latitude: unknown; longitude: unknown };
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

// ponytail: conversation jsonb is untrusted — mirrors app/api/requests/route.ts ranges; reprompt, never coerce
function requestCommitProblem(data: Record<string, string | number | boolean | null>): { field: string; message: string } | null {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (name.length < 2 || name.length > 60) return { field: "name", message: "That patient name looks invalid (2–60 characters)." };
  const contact = typeof data.contact === "string" ? data.contact.trim() : "";
  if (contact.length < 3 || contact.length > 100) return { field: "contact", message: "That contact looks invalid (3–100 characters)." };
  if (typeof data.bloodGroup !== "string" || !isTelegramBloodGroup(data.bloodGroup)) return { field: "blood", message: "That blood group looks invalid." };
  if (typeof data.units !== "number" || !Number.isInteger(data.units) || data.units < 1 || data.units > 10) return { field: "units", message: "Those units look invalid (1–10)." };
  if (data.urgency !== "ROUTINE" && data.urgency !== "URGENT" && data.urgency !== "EMERGENCY") return { field: "urgency", message: "That urgency looks invalid." };
  const hospital = typeof data.hospital === "string" ? data.hospital.trim() : "";
  if (hospital.length < 2 || hospital.length > 100) return { field: "hospital", message: "That hospital name looks invalid (2–100 characters)." };
  if (!validCoords({ latitude: data.latitude, longitude: data.longitude })) return { field: "location", message: "That hospital location looks invalid." };
  return null;
}

// ponytail: same reprompt-not-coerce rule for the donor commit
function donorCommitProblem(data: Record<string, string | number | boolean | null>): { field: string; message: string } | null {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (name.length < 2 || name.length > 60) return { field: "name", message: "That name looks invalid (2–60 characters)." };
  if (typeof data.contact !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact.trim())) return { field: "contact", message: "That email looks invalid." };
  if (typeof data.bloodGroup !== "string" || !bloodGroups.includes(data.bloodGroup as BloodGroup)) return { field: "blood", message: "That blood group looks invalid." };
  if (data.lastDonationDate !== null && (typeof data.lastDonationDate !== "string" || !normalizeCalendarDate(data.lastDonationDate))) return { field: "last", message: "That donation date looks invalid." };
  if (!validCoords({ latitude: data.latitude, longitude: data.longitude })) return { field: "location", message: "That location looks invalid." };
  return null;
}

// ponytail: edit buttons jump to one step with data kept; the step's normal handler flows forward to confirm again
async function handleRequestEdit(chatId: string, field: string): Promise<void> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("request_")) return;
  const data = conversation.data;
  switch (field) {
    case "name":
      await saveTelegramConversation(chatId, "request_name", data);
      await sendTelegramMessage(chatId, "What is the patient’s name?");
      break;
    case "contact":
      await saveTelegramConversation(chatId, "request_contact", data);
      await sendTelegramMessage(chatId, "What is the patient’s contact number or email?");
      break;
    case "blood":
      await saveTelegramConversation(chatId, "request_blood_group", data);
      await sendTelegramMessage(chatId, "Which blood group is needed?", bloodGroupKeyboard());
      break;
    case "units":
      await saveTelegramConversation(chatId, "request_units", data);
      await sendTelegramMessage(chatId, "How many units are needed? Send a number from 1 to 10.");
      break;
    case "urgency":
      await saveTelegramConversation(chatId, "request_urgency", data);
      await sendTelegramMessage(chatId, "How urgent is this request?", requesterUrgencyKeyboard());
      break;
    case "hospital":
      await saveTelegramConversation(chatId, "request_hospital", data);
      await sendTelegramMessage(chatId, "Which hospital should receive the blood?");
      break;
    case "location":
      await saveTelegramConversation(chatId, "request_location", data);
      await sendTelegramReplyKeyboard(chatId, "Please share the hospital location using the button below.", {
        keyboard: [[{ text: "Share hospital location", request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      });
      break;
    default:
      await sendTelegramMessage(chatId, requestConfirmationText(data), requesterConfirmationKeyboard());
      break;
  }
}

async function requesterId(chatId: string): Promise<string> {
  return `telegram:${await getOrCreateTelegramRequester(chatId)}`;
}

async function requesterStatus(chatId: string): Promise<string> {
  const requests = await listRequestsByRequesterId(await requesterId(chatId));
  if (!requests.length) return "No blood requests have been created from this Telegram chat.";
  return `Your blood requests:\n\n${requests.slice(0, 5).map(formatTelegramRequest).join("\n\n")}`;
}

async function handleRequesterFlow(chatId: string, text: string | undefined, location?: { latitude: number; longitude: number }): Promise<boolean> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("request_")) return false;
  const value = text?.trim();
  switch (conversation.state) {
    case "request_name":
      if (!value || value.length < 2 || value.length > 60) {
        await sendTelegramMessage(chatId, "Please send the patient’s name (2–60 characters).");
      } else {
        await saveTelegramConversation(chatId, "request_contact", { name: value });
        await sendTelegramMessage(chatId, "What is the patient’s contact number or email?");
      }
      return true;
    case "request_contact":
      if (!value || value.length < 3 || value.length > 100) {
        await sendTelegramMessage(chatId, "Please send a contact number or email (3–100 characters).");
      } else {
        await saveTelegramConversation(chatId, "request_blood_group", { ...conversation.data, contact: value });
        await sendTelegramMessage(chatId, "Which blood group is needed?", bloodGroupKeyboard());
      }
      return true;
    case "request_blood_group":
      if (!value || !isTelegramBloodGroup(value)) await sendTelegramMessage(chatId, `Please choose one of: ${bloodGroups.join(", ")}`, bloodGroupKeyboard());
      else {
        await saveTelegramConversation(chatId, "request_units", { ...conversation.data, bloodGroup: value });
        await sendTelegramMessage(chatId, "How many units are needed? Tap a number or type 1 to 10.", unitsKeyboard());
      }
      return true;
    case "request_units": {
      const units = value ? parseTelegramUnits(value) : null;
      if (!units) await sendTelegramMessage(chatId, "Please send a whole number from 1 to 10.");
      else {
        await saveTelegramConversation(chatId, "request_urgency", { ...conversation.data, units });
        await sendTelegramMessage(chatId, "How urgent is this request?", requesterUrgencyKeyboard());
      }
      return true;
    }
    case "request_urgency": {
      const urgency = value ? parseTelegramUrgency(value) : null;
      if (!urgency) await sendTelegramMessage(chatId, "Choose Routine, Urgent, or Emergency.", requesterUrgencyKeyboard());
      else {
        await saveTelegramConversation(chatId, "request_hospital", { ...conversation.data, urgency });
        await sendTelegramMessage(chatId, "Which hospital should receive the blood?");
      }
      return true;
    }
    case "request_hospital": {
      const hospital = value ? parseTelegramHospital(value) : null;
      if (!hospital) await sendTelegramMessage(chatId, "Please send a hospital name between 2 and 100 characters.");
      else {
        await saveTelegramConversation(chatId, "request_location", { ...conversation.data, hospital });
        await sendTelegramReplyKeyboard(chatId, "Please share the hospital location using the button below.", {
          keyboard: [[{ text: "Share hospital location", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      }
      return true;
    }
    case "request_location":
      if (!location || !validCoords(location)) {
        await sendTelegramReplyKeyboard(chatId, "That location looks invalid. Please tap “Share hospital location” so nearby donors can be matched.", {
          keyboard: [[{ text: "Share hospital location", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      } else {
        const data: Record<string, string | number | boolean | null> = { ...conversation.data, latitude: location.latitude, longitude: location.longitude };
        await saveTelegramConversation(chatId, "request_confirmation", data);
        await sendTelegramMessage(chatId, requestConfirmationText(data), requesterConfirmationKeyboard());
      }
      return true;
    case "request_confirmation":
      if (/^edit$/i.test(value ?? "")) {
        await showRequestMenu(chatId);
        return true;
      }
      if (!/^yes$/i.test(value ?? "")) {
        if (/^no$/i.test(value ?? "")) {
          await clearTelegramConversation(chatId);
          await sendTelegramMessage(chatId, "Request cancelled. Send /request whenever you need blood.");
        } else await sendTelegramMessage(chatId, "Tap Create request to send, Edit to change an answer, or Cancel.", requesterConfirmationKeyboard());
        return true;
      }
      {
        const data = conversation.data;
        const problem = requestCommitProblem(data);
        if (problem) {
          await sendTelegramMessage(chatId, `⚠️ ${problem.message} Let's fix it.`, requesterConfirmationKeyboard());
          await handleRequestEdit(chatId, problem.field);
          return true;
        }
        // ponytail: conditional claim — double-tap finds a non-confirmation state (0 rows) and is ignored, no duplicate request
        if (!await claimTelegramConversation(chatId, "request_confirmation", "request_creating", data)) return true;
        let request;
        try {
          try {
            await updateTelegramRequester(chatId, { name: (data.name as string).trim(), contact: (data.contact as string).trim() });
          } catch (error) {
            // ponytail: contact save is best-effort until migration 0006 is applied; never block the request itself
            console.error(JSON.stringify({ event: "telegram_requester_contact_failed", error: errText(error) }));
          }
          request = await createRequest({
            requesterId: await requesterId(chatId),
            bloodGroup: data.bloodGroup as BloodGroup,
            unitsRequired: data.units as number,
            hospital: (data.hospital as string).trim(),
            location: { latitude: data.latitude as number, longitude: data.longitude as number },
            urgency: data.urgency as "ROUTINE" | "URGENT" | "EMERGENCY",
            status: "OPEN",
            createdAt: new Date().toISOString(),
            contact: (data.contact as string).trim(),
          });
        } catch (error) {
          console.error(JSON.stringify({ event: "telegram_request_create_failed", error: errText(error) }));
          await saveTelegramConversation(chatId, "request_confirmation", data);
          await sendTelegramMessage(chatId, "Something went wrong creating your request. Tap Create request to try again.", requesterConfirmationKeyboard());
          return true;
        }
        // ponytail: same match+queue as POST /requests/[id]/match; best-effort so notify failure never fails the request
        try {
          const matches = matchDonors(request, await listDonors(), await listNotifications());
          await queueNotifications(request.id, matches.selected.map(item => item.donorId), 1);
          console.info(JSON.stringify({ event: "matching_completed", requestId: request.id, selected: matches.selected.length, source: "telegram" }));
        } catch (error) {
          console.error(JSON.stringify({ event: "telegram_match_failed", requestId: request.id, error: errText(error) }));
        }
        await clearTelegramConversation(chatId);
        await sendTelegramMessage(chatId, `✅ Blood request created.\n\n${formatTelegramRequest(request)}\n\nUse /status to check it or /cancel_request ${request.id} to cancel it.`);
      }
      return true;
  }
  return true;
}

async function handleDonorFlow(chatId: string, text: string | undefined, location?: { latitude: number; longitude: number }): Promise<boolean> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("donor_")) return false;
  const value = text?.trim();

  switch (conversation.state) {
    case "donor_name":
      if (!value || value.length < 2 || value.length > 60) {
        await sendTelegramMessage(chatId, "Please send your full name (2–60 characters).");
      } else {
        await saveTelegramConversation(chatId, "donor_email", { name: value });
        await sendTelegramMessage(chatId, "What email address should we use for confirmed matches?");
      }
      return true;
    case "donor_email":
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        await sendTelegramMessage(chatId, "Please send a valid email address.");
      } else {
        await saveTelegramConversation(chatId, "donor_blood_group", { ...conversation.data, contact: value });
        await sendTelegramMessage(chatId, "Which blood group do you have?", bloodGroupKeyboard());
      }
      return true;
    case "donor_blood_group":
      if (!value || !bloodGroups.includes(value as BloodGroup)) {
        await sendTelegramMessage(chatId, `Please send one of: ${bloodGroups.join(", ")}`);
      } else {
        await saveTelegramConversation(chatId, "donor_last_donation", { ...conversation.data, bloodGroup: value });
        await sendDonatedGate(chatId);
      }
      return true;
    case "donor_last_donation": {
      // ponytail: gate first — calendar only for prior donors; typed dates skip straight to confirm
      const raw = (value ?? "").trim();
      const normalizedDate = raw ? normalizeTelegramDonationDate(raw) : undefined;
      if (/^(no|none)$/i.test(raw)) {
        await saveTelegramConversation(chatId, "donor_location", { ...conversation.data, lastDonationDate: null });
        await sendTelegramReplyKeyboard(chatId, "Please share your location using the button below. We use it only to find nearby requests.", {
          keyboard: [[{ text: "Share my location", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      } else if (typeof normalizedDate === "string") {
        await saveTelegramConversation(chatId, "donor_date_confirm", { ...conversation.data, lastDonationDate: normalizedDate });
        await sendTelegramMessage(chatId, `You selected: ${formatDisplayDate(normalizedDate)}.\n\nIs this correct?`, dateConfirmKeyboard());
      } else if (/^yes$/i.test(raw)) {
        const saved = await getTelegramConversation(chatId);
        await sendDonationCalendar(chatId, typeof saved?.data.lastDonationDate === "string" ? saved.data.lastDonationDate : undefined);
      } else {
        await sendTelegramMessage(chatId, "Have you donated blood before? Tap Yes or No — or just type the date directly.", donatedKeyboard());
      }
      return true;
    }
    case "donor_date_confirm": {
      const picked = value ? normalizeTelegramDonationDate(value) : undefined;
      if (/^none$/i.test(value ?? "")) {
        await saveTelegramConversation(chatId, "donor_fit_age", { ...conversation.data, lastDonationDate: null });
        await sendTelegramMessage(chatId, "🩺 Quick health check — one question at a time, skip any you can't answer.\n\nHow old are you? Send your age in years.");
      } else if (/^yes$/i.test(value ?? "") || /^confirm$/i.test(value ?? "")) {
        await saveTelegramConversation(chatId, "donor_fit_age", conversation.data);
        await sendTelegramMessage(chatId, "🩺 Quick health check — one question at a time, skip any you can't answer.\n\nHow old are you? Send your age in years.");
      } else if (typeof picked === "string") {
        await saveTelegramConversation(chatId, "donor_date_confirm", { ...conversation.data, lastDonationDate: picked });
        await sendTelegramMessage(chatId, `You selected: ${formatDisplayDate(picked)}.\n\nIs this correct?`, dateConfirmKeyboard());
      } else if (/^(no|change|edit)$/i.test(value ?? "")) {
        const saved = await getTelegramConversation(chatId);
        await sendDonationCalendar(chatId, typeof saved?.data.lastDonationDate === "string" ? saved.data.lastDonationDate : undefined);
      } else {
        const current = conversation.data.lastDonationDate;
        await sendTelegramMessage(chatId, `Currently selected: ${typeof current === "string" ? formatDisplayDate(current) : "none"}.\n\nTap Yes to keep it or Change date.`, dateConfirmKeyboard());
      }
      return true;
    }
    // ponytail: fitness mirrors the web form order with the same canonical evaluateFitness gate;
    // yes/no questions exit early on a blocking answer so nobody answers 8 dead questions
    case "donor_fit_age": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "skip") {
        await saveTelegramConversation(chatId, "donor_fit_sex", { ...conversation.data, ageYears: null });
        await sendTelegramMessage(chatId, "What is your sex?", fitSexKeyboard());
      } else if (/^\d{1,3}$/.test(raw) && Number(raw) >= 0 && Number(raw) <= 120) {
        await saveTelegramConversation(chatId, "donor_fit_sex", { ...conversation.data, ageYears: Number(raw) });
        await sendTelegramMessage(chatId, "What is your sex?", fitSexKeyboard());
      } else {
        await sendTelegramMessage(chatId, "Send your age in years (for example 28), or skip.");
      }
      return true;
    }
    case "donor_fit_sex": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "male" || raw === "other") {
        await saveTelegramConversation(chatId, "donor_fit_weight", { ...conversation.data, sex: raw });
        await sendTelegramMessage(chatId, "What is your weight in kilograms? Minimum 45 kg to donate. Send a number, or skip.");
      } else if (raw === "female") {
        const age = typeof conversation.data.ageYears === "number" ? conversation.data.ageYears : null;
        await saveTelegramConversation(chatId, age != null && age >= 15 && age <= 49 ? "donor_fit_preg" : "donor_fit_weight", { ...conversation.data, sex: raw });
        if (age != null && age >= 15 && age <= 49) await sendTelegramMessage(chatId, "Are you pregnant now?", fitYesNoKeyboard("preg"));
        else await sendTelegramMessage(chatId, "What is your weight in kilograms? Minimum 45 kg to donate. Send a number, or skip.");
      } else if (raw === "skip") {
        await saveTelegramConversation(chatId, "donor_fit_weight", { ...conversation.data, sex: null });
        await sendTelegramMessage(chatId, "What is your weight in kilograms? Minimum 45 kg to donate. Send a number, or skip.");
      } else {
        await sendTelegramMessage(chatId, "Tap Male, Female, Other, or Skip.", fitSexKeyboard());
      }
      return true;
    }
    case "donor_fit_preg": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "yes") {
        await blockFitness(chatId, { isPregnantNow: true });
      } else if (raw === "no") {
        await saveTelegramConversation(chatId, "donor_fit_pregend", { ...conversation.data, isPregnantNow: false });
        await sendTelegramMessage(chatId, "Any delivery or abortion in the last 12 months?", fitYesNoKeyboard("pregend"));
      } else if (raw === "skip") {
        await saveTelegramConversation(chatId, "donor_fit_breast", { ...conversation.data, isPregnantNow: null });
        await sendTelegramMessage(chatId, "Are you breastfeeding now?", fitYesNoKeyboard("breast"));
      } else {
        await sendTelegramMessage(chatId, "Are you pregnant now? Tap Yes, No, or Skip.", fitYesNoKeyboard("preg"));
      }
      return true;
    }
    case "donor_fit_pregend": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "yes") {
        await saveTelegramConversation(chatId, "donor_fit_pregdate", conversation.data);
        await sendPregdateCalendar(chatId);
      } else if (raw === "no" || raw === "skip") {
        await saveTelegramConversation(chatId, "donor_fit_breast", { ...conversation.data, lastPregnancyEndDate: null });
        await sendTelegramMessage(chatId, "Are you breastfeeding now?", fitYesNoKeyboard("breast"));
      } else {
        const typed = raw ? normalizeTelegramDonationDate(raw) : undefined;
        if (typeof typed === "string") {
          await saveTelegramConversation(chatId, "donor_fit_breast", { ...conversation.data, lastPregnancyEndDate: typed });
          await sendTelegramMessage(chatId, "Are you breastfeeding now?", fitYesNoKeyboard("breast"));
        } else await sendTelegramMessage(chatId, "Any delivery or abortion in the last 12 months? Tap Yes, No, or Skip.", fitYesNoKeyboard("pregend"));
      }
      return true;
    }
    case "donor_fit_pregdate": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "skip" || raw === "none") {
        await saveTelegramConversation(chatId, "donor_fit_breast", { ...conversation.data, lastPregnancyEndDate: null });
        await sendTelegramMessage(chatId, "Are you breastfeeding now?", fitYesNoKeyboard("breast"));
      } else {
        const typed = raw ? normalizeTelegramDonationDate(raw) : undefined;
        if (typeof typed !== "string") await sendPregdateCalendar(chatId);
        else {
          await saveTelegramConversation(chatId, "donor_fit_breast", { ...conversation.data, lastPregnancyEndDate: typed });
          await sendTelegramMessage(chatId, "Are you breastfeeding now?", fitYesNoKeyboard("breast"));
        }
      }
      return true;
    }
    case "donor_fit_breast": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "yes") {
        await blockFitness(chatId, { isBreastfeedingNow: true });
      } else if (raw === "no" || raw === "skip") {
        await saveTelegramConversation(chatId, "donor_fit_weight", { ...conversation.data, isBreastfeedingNow: raw === "no" ? false : null });
        await sendTelegramMessage(chatId, "What is your weight in kilograms? Minimum 45 kg to donate. Send a number, or skip.");
      } else {
        await sendTelegramMessage(chatId, "Are you breastfeeding now? Tap Yes, No, or Skip.", fitYesNoKeyboard("breast"));
      }
      return true;
    }
    case "donor_fit_weight": {
      const raw = (value ?? "").trim().toLowerCase();
      const num = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
      if (raw === "skip" || raw === "unknown") {
        await saveTelegramConversation(chatId, "donor_fit_hb", { ...conversation.data, weightKg: null });
        await sendTelegramMessage(chatId, "What is your hemoglobin in g/dL (for example 13.5)? 12.5 or above is required. Send a number, or skip.");
      } else if (num !== null && num >= 20 && num <= 500) {
        await saveTelegramConversation(chatId, "donor_fit_hb", { ...conversation.data, weightKg: num });
        await sendTelegramMessage(chatId, "What is your hemoglobin in g/dL (for example 13.5)? 12.5 or above is required. Send a number, or skip.");
      } else {
        await sendTelegramMessage(chatId, "Send your weight in kilograms (for example 62), or skip.");
      }
      return true;
    }
    case "donor_fit_hb": {
      const raw = (value ?? "").trim().toLowerCase();
      const num = /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
      if (raw === "skip" || raw === "unknown") {
        await saveTelegramConversation(chatId, "donor_fit_bp", { ...conversation.data, hemoglobinGdl: null });
        await sendTelegramMessage(chatId, "What is your blood pressure? Send two numbers like 120 80, or skip.");
      } else if (num !== null && num >= 1 && num <= 30) {
        await saveTelegramConversation(chatId, "donor_fit_bp", { ...conversation.data, hemoglobinGdl: num });
        await sendTelegramMessage(chatId, "What is your blood pressure? Send two numbers like 120 80, or skip.");
      } else {
        await sendTelegramMessage(chatId, "Send hemoglobin in g/dL (for example 13.5), or skip.");
      }
      return true;
    }
    case "donor_fit_bp": {
      const raw = (value ?? "").trim().toLowerCase();
      const match = raw.match(/^(\d{2,3})\s+(\d{2,3})$/);
      const sys = match ? Number(match[1]) : null;
      const dia = match ? Number(match[2]) : null;
      if (raw === "skip" || raw === "unknown") {
        await saveTelegramConversation(chatId, "donor_fit_pulse", { ...conversation.data, systolicBpMmhg: null, diastolicBpMmhg: null });
        await sendTelegramMessage(chatId, "What is your pulse in beats per minute (for example 72)? Usual range 60–100. Send a number, or skip.");
      } else if (sys !== null && dia !== null && sys >= 50 && sys <= 300 && dia >= 20 && dia <= 200) {
        await saveTelegramConversation(chatId, "donor_fit_pulse", { ...conversation.data, systolicBpMmhg: sys, diastolicBpMmhg: dia });
        await sendTelegramMessage(chatId, "What is your pulse in beats per minute (for example 72)? Usual range 60–100. Send a number, or skip.");
      } else {
        await sendTelegramMessage(chatId, "Send two numbers like 120 80 (systolic diastolic), or skip.");
      }
      return true;
    }
    case "donor_fit_pulse": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "skip" || raw === "unknown") {
        await saveTelegramConversation(chatId, "donor_fit_ill", { ...conversation.data, pulseBpm: null });
        await sendTelegramMessage(chatId, "Any illness or antibiotics in the last 14 days?", fitYesNoKeyboard("ill"));
      } else if (/^\d{2,3}$/.test(raw) && Number(raw) >= 20 && Number(raw) <= 250) {
        await saveTelegramConversation(chatId, "donor_fit_ill", { ...conversation.data, pulseBpm: Number(raw) });
        await sendTelegramMessage(chatId, "Any illness or antibiotics in the last 14 days?", fitYesNoKeyboard("ill"));
      } else {
        await sendTelegramMessage(chatId, "Send your pulse in beats per minute (for example 72), or skip.");
      }
      return true;
    }
    case "donor_fit_ill": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "yes") {
        await blockFitness(chatId, { illnessAntibiotics14d: true });
      } else if (raw === "no" || raw === "skip") {
        await saveTelegramConversation(chatId, "donor_fit_tat", { ...conversation.data, illnessAntibiotics14d: raw === "no" ? false : null });
        await sendTelegramMessage(chatId, "Any tattoo or piercing in the last 12 months?", fitYesNoKeyboard("tat"));
      } else {
        await sendTelegramMessage(chatId, "Any illness or antibiotics in the last 14 days? Tap Yes, No, or Skip.", fitYesNoKeyboard("ill"));
      }
      return true;
    }
    case "donor_fit_tat": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "yes") {
        await blockFitness(chatId, { tattooPiercing12m: true });
      } else if (raw === "no" || raw === "skip") {
        await saveTelegramConversation(chatId, "donor_fit_alc", { ...conversation.data, tattooPiercing12m: raw === "no" ? false : null });
        await sendTelegramMessage(chatId, "Any alcohol in the last 24 hours?", fitYesNoKeyboard("alc"));
      } else {
        await sendTelegramMessage(chatId, "Any tattoo or piercing in the last 12 months? Tap Yes, No, or Skip.", fitYesNoKeyboard("tat"));
      }
      return true;
    }
    case "donor_fit_alc": {
      const raw = (value ?? "").trim().toLowerCase();
      if (raw === "yes") {
        await blockFitness(chatId, { alcohol24h: true });
      } else if (raw === "no" || raw === "skip") {
        const saved = await getTelegramConversation(chatId);
        const data = { ...(saved?.data ?? conversation.data), alcohol24h: raw === "no" ? false : null };
        const result = evaluateFitness(pickFitness(data));
        if (result.blocked) {
          await clearTelegramConversation(chatId);
          await sendTelegramMessage(chatId, `⛔ Thanks for answering honestly.\n\n${result.blocked}${result.deferUntil ? `\n\nYou can try again after ${result.deferUntil}. Just send /donate then.` : "\n\nSend /donate whenever you're ready."}`);
        } else {
          await saveTelegramConversation(chatId, "donor_location", data);
          await sendTelegramReplyKeyboard(chatId, "Health check done ✅\n\nPlease share your location using the button below. We use it only to find nearby requests.", {
            keyboard: [[{ text: "Share my location", request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          });
        }
      } else {
        await sendTelegramMessage(chatId, "Any alcohol in the last 24 hours? Tap Yes, No, or Skip.", fitYesNoKeyboard("alc"));
      }
      return true;
    }
    case "donor_location":
      if (!location || !validCoords(location)) {
        await sendTelegramReplyKeyboard(chatId, "That location looks invalid. Please tap “Share my location” so we can finish registration.", {
          keyboard: [[{ text: "Share my location", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      } else {
        await saveTelegramConversation(chatId, "donor_consent", {
          ...conversation.data,
          latitude: location.latitude,
          longitude: location.longitude,
        });
        await sendTelegramMessage(chatId, "I agree to receive relevant blood-donation notifications. Choose yes to confirm or no to cancel.", consentKeyboard());
      }
      return true;
    case "donor_consent":
      if (/^no$/i.test(value ?? "")) {
        await clearTelegramConversation(chatId);
        await sendTelegramMessage(chatId, "Registration cancelled. Send /donate whenever you are ready.");
      } else if (!/^yes$/i.test(value ?? "")) {
        await sendTelegramMessage(chatId, "Choose yes to confirm receiving relevant donor notifications, or no to cancel.", consentKeyboard());
      } else {
        // ponytail: consent yes -> review summary before any DB write
        await saveTelegramConversation(chatId, "donor_review", conversation.data);
        await sendTelegramMessage(chatId, donorSummary(conversation.data), donorReviewKeyboard());
      }
      return true;
    case "donor_review": {
      const normalized = (value ?? "").toLowerCase();
      if (normalized === "no" || normalized === "cancel") {
        await clearTelegramConversation(chatId);
        await sendTelegramMessage(chatId, "Registration cancelled. Send /donate whenever you are ready.");
      } else if (normalized === "edit") {
        await showDonorMenu(chatId);
      } else if (normalized === "yes" || normalized === "confirm") {
        const data = conversation.data;
        const problem = donorCommitProblem(data);
        if (problem) {
          await sendTelegramMessage(chatId, `⚠️ ${problem.message} Let's fix it.`, donorReviewKeyboard());
          await handleDonorEdit(chatId, problem.field);
          return true;
        }
        // ponytail: conditional claim — double-tap finds a non-review state (0 rows) and is ignored, no duplicate donor
        if (!await claimTelegramConversation(chatId, "donor_review", "donor_creating", data)) return true;
        // ponytail: re-evaluate at commit — answers predate the review screen
        const finalFit = evaluateFitness(pickFitness(data));
        if (finalFit.blocked) {
          await clearTelegramConversation(chatId);
          await sendTelegramMessage(chatId, `⛔ Thanks for answering honestly.\n\n${finalFit.blocked}${finalFit.deferUntil ? `\n\nYou can try again after ${finalFit.deferUntil}. Just send /donate then.` : "\n\nSend /donate whenever you're ready."}`);
          return true;
        }
        let donor;
        try {
          donor = await createTelegramDonor({
            chatId,
            name: (data.name as string).trim(),
            contact: (data.contact as string).trim(),
            bloodGroup: data.bloodGroup as BloodGroup,
            latitude: data.latitude as number,
            longitude: data.longitude as number,
            lastDonationDate: (data.lastDonationDate as string | null) ?? null,
            fitness: {
              sex: typeof data.sex === "string" ? data.sex : null,
              ...pickFitness(data),
              fitnessDeferUntil: finalFit.deferUntil,
              fitnessUnverified: finalFit.unverified,
            },
          });
        } catch (error) {
          console.error(JSON.stringify({ event: "telegram_donor_create_failed", error: errText(error) }));
          await saveTelegramConversation(chatId, "donor_review", data);
          await sendTelegramMessage(chatId, "Something went wrong saving your registration. Tap Register me to try again.", donorReviewKeyboard());
          return true;
        }
        await clearTelegramConversation(chatId);
        await sendTelegramMessage(chatId, `✅ You’re registered, ${donor.name}.\n\nWe’ll notify you here about compatible nearby requests. Use /status to check your profile.`);
      } else {
        await sendTelegramMessage(chatId, "Tap Register me to save, Edit to change an answer, or Cancel.", donorReviewKeyboard());
      }
      return true;
    }
  }
  return true;
}

// ponytail: menus edit the review message in place when tapped, or send fresh when typed
async function showRequestMenu(chatId: string, messageId?: number): Promise<void> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("request_")) return;
  await showOrSend(chatId, messageId, "What do you want to change? Tap a field.", requesterEditMenuKeyboard());
}

async function showRequestReview(chatId: string, messageId?: number): Promise<void> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("request_")) return;
  await showOrSend(chatId, messageId, requestConfirmationText(conversation.data), requesterConfirmationKeyboard());
}

async function showDonorMenu(chatId: string, messageId?: number): Promise<void> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("donor_")) return;
  await showOrSend(chatId, messageId, "What do you want to change? Tap a field.", donorEditMenuKeyboard());
}

async function showDonorReview(chatId: string, messageId?: number): Promise<void> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("donor_")) return;
  await showOrSend(chatId, messageId, donorSummary(conversation.data), donorReviewKeyboard());
}

async function showOrSend(chatId: string, messageId: number | undefined, text: string, keyboard: Parameters<typeof editTelegramMessage>[3]): Promise<void> {
  if (messageId) {
    try { await editTelegramMessage(chatId, messageId, text, keyboard); return; }
    catch { /* fall through to a fresh message */ }
  }
  await sendTelegramMessage(chatId, text, keyboard);
}

function fitText(label: string, value: string | number | boolean | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) return `• ${label}: —`;
  if (typeof value === "boolean") return `• ${label}: ${value ? "Yes" : "No"}`;
  return `• ${label}: ${value}${suffix}`;
}

function donorSummary(data: Record<string, string | number | boolean | null>): string {
  const fit = pickFitness(data);
  const check = evaluateFitness(fit);
  const lines = [
    `• Name: ${String(data["name"] ?? "—")}`,
    `• Email: ${String(data["contact"] ?? "—")}`,
    `• Blood group: ${String(data["bloodGroup"] ?? "—")}`,
    `• Last donation: ${typeof data["lastDonationDate"] === "string" ? formatDisplayDate(data["lastDonationDate"]) : "none"}`,
    `• Age: ${data["ageYears"] ?? "—"} • Sex: ${String(data["sex"] ?? "—")}`,
    fitText("Weight", data["weightKg"], " kg"),
    fitText("Hemoglobin", data["hemoglobinGdl"], " g/dL"),
    data["systolicBpMmhg"] != null || data["diastolicBpMmhg"] != null
      ? `• BP: ${data["systolicBpMmhg"] ?? "—"}/${data["diastolicBpMmhg"] ?? "—"}`
      : "• BP: —",
    fitText("Pulse", data["pulseBpm"], " bpm"),
    fitText("Illness/antibiotics (14d)", data["illnessAntibiotics14d"]),
    fitText("Tattoo/piercing (12m)", data["tattooPiercing12m"]),
    fitText("Alcohol (24h)", data["alcohol24h"]),
  ];
  if (String(data["sex"]) === "female") {
    lines.push(fitText("Pregnant now", data["isPregnantNow"]));
    lines.push(typeof data["lastPregnancyEndDate"] === "string" ? `• Last pregnancy ended: ${formatDisplayDate(data["lastPregnancyEndDate"])}` : "• Last pregnancy ended: —");
    lines.push(fitText("Breastfeeding", data["isBreastfeedingNow"]));
  }
  lines.push(`• Location: ${data["latitude"] ?? "—"}, ${data["longitude"] ?? "—"}`);
  lines.push("• Notifications: Yes, in this chat");
  if (check.unverified) lines.push("⚠️ Some health details skipped — profile will be marked unverified (the blood bank still checks on site).");
  return `🩸 Please confirm your donor registration:\n\n${lines.join("\n")}\n\nTap Register me to save, Edit to change an answer, or Cancel.`;
}

async function sendDonatedGate(chatId: string): Promise<void> {
  await sendTelegramMessage(chatId, "Have you donated blood before?", donatedKeyboard());
}

// ponytail: conversation data carries the canonical FitnessFields keys so evaluateFitness applies unchanged
function pickFitness(data: Record<string, string | number | boolean | null>): FitnessFields {
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
  return {
    ageYears: num(data.ageYears), weightKg: num(data.weightKg), hemoglobinGdl: num(data.hemoglobinGdl),
    systolicBpMmhg: num(data.systolicBpMmhg), diastolicBpMmhg: num(data.diastolicBpMmhg), pulseBpm: num(data.pulseBpm),
    isPregnantNow: bool(data.isPregnantNow), lastPregnancyEndDate: str(data.lastPregnancyEndDate),
    isBreastfeedingNow: bool(data.isBreastfeedingNow), illnessAntibiotics14d: bool(data.illnessAntibiotics14d),
    tattooPiercing12m: bool(data.tattooPiercing12m), alcohol24h: bool(data.alcohol24h),
  };
}

async function blockFitness(chatId: string, partial: FitnessFields): Promise<void> {
  const result = evaluateFitness(partial);
  await clearTelegramConversation(chatId);
  await sendTelegramMessage(chatId, `⛔ Thanks for answering honestly.\n\n${result.blocked ?? "You can't register right now."}${result.deferUntil ? `\n\nYou can try again after ${result.deferUntil}. Just send /donate then.` : "\n\nSend /donate whenever you're ready."}`);
}

async function sendPregdateCalendar(chatId: string): Promise<void> {
  const now = new Date();
  await sendTelegramMessage(chatId, "When did it end? Tap a date below, type it as day month year, or skip.", donationCalendarKeyboard(now.getFullYear(), now.getMonth() + 1));
}

async function sendDonationCalendar(chatId: string, isoMonth?: string | number | boolean | null): Promise<void> {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  const match = typeof isoMonth === "string" ? isoMonth.match(/^(\d{4})-(\d{2})/) : null;
  if (match) { y = Number(match[1]); m = Number(match[2]); }
  await sendTelegramMessage(chatId, "When was your last donation? Tap a date below, or type it as day month year (for example 28 02 2005), or type none.", donationCalendarKeyboard(y, m));
}

// ponytail: edit buttons jump to one step with data kept; the step's normal handler flows forward again
async function handleDonorEdit(chatId: string, field: string): Promise<void> {
  const conversation = await getTelegramConversation(chatId);
  if (!conversation?.state.startsWith("donor_")) return;
  const data = conversation.data;
  switch (field) {
    case "name":
      await saveTelegramConversation(chatId, "donor_name", data);
      await sendTelegramMessage(chatId, "What is your full name?");
      break;
    case "contact":
      await saveTelegramConversation(chatId, "donor_email", data);
      await sendTelegramMessage(chatId, "What email address should we use for confirmed matches?");
      break;
    case "blood":
      await saveTelegramConversation(chatId, "donor_blood_group", data);
      await sendTelegramMessage(chatId, "Which blood group do you have?", bloodGroupKeyboard());
      break;
    case "last":
      await saveTelegramConversation(chatId, "donor_last_donation", data);
      await sendDonatedGate(chatId);
      break;
    case "location":
      await saveTelegramConversation(chatId, "donor_location", data);
      await sendTelegramReplyKeyboard(chatId, "Please share your location using the button below.", {
        keyboard: [[{ text: "Share my location", request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      });
      break;
    case "fitness": {
      // ponytail: one Edit button for all 12 fitness answers — clear and re-ask from age
      const keep: Record<string, string | number | boolean | null> = {};
      for (const [key, value] of Object.entries(data)) {
        if (["name", "contact", "bloodGroup", "lastDonationDate", "latitude", "longitude"].includes(key)) keep[key] = value;
      }
      await saveTelegramConversation(chatId, "donor_fit_age", keep);
      await sendTelegramMessage(chatId, "No problem — let's redo the health check.\n\nHow old are you? Send your age in years, or skip.");
      break;
    }
    default:
      await sendTelegramMessage(chatId, donorSummary(data), donorReviewKeyboard());
      break;
  }
}

async function handleMessage(chatId: string, text?: string, location?: { latitude: number; longitude: number }) {
  const parsed = text ? command(text) : null;
  if (!parsed && (await handleRequesterFlow(chatId, text, location) || await handleDonorFlow(chatId, text, location))) return;
  if (!parsed) {
    await sendTelegramMessage(chatId, helpText, telegramEntryKeyboard());
    return;
  }
  switch (parsed.name) {
    case "donate":
      await startDonorFlow(chatId);
      break;
    case "request":
    case "need_blood":
      await startRequesterFlow(chatId);
      break;
    case "start": {
      const linked = parsed.payload ? await linkTelegramDonor(parsed.payload, chatId) : null;
      await sendTelegramMessage(chatId, linked ? "✅ Telegram is now connected to your BloodLink donor profile.\n\nChoose how you want to continue." : parsed.payload ? "That linking link is invalid or expired. Create a new donor profile link and try again." : "🩸 Welcome to BloodLink.\n\nChoose how you want to continue.", telegramEntryKeyboard());
      break;
    }
    case "help":
      await sendTelegramMessage(chatId, helpText, telegramEntryKeyboard());
      break;
    case "status":
      await sendTelegramMessage(chatId, `${await donorStatus(chatId)}\n\n${await requesterStatus(chatId)}`);
      break;
    case "cancel":
      await clearTelegramConversation(chatId);
      await sendTelegramMessage(chatId, "The current Telegram flow was cancelled.");
      break;
    case "disconnect": {
      const donor = await disconnectTelegramDonor(chatId);
      await sendTelegramMessage(chatId, donor ? "This Telegram chat was disconnected from your donor profile." : "No donor profile was linked to this Telegram chat.");
      break;
    }
    case "cancel_request": {
      const requestId = parsed.payload;
      if (!requestId) {
        await sendTelegramMessage(chatId, "Use /cancel_request <request-id>.");
        break;
      }
      const cancelled = await cancelRequestForRequester(requestId, await requesterId(chatId));
      await sendTelegramMessage(chatId, cancelled ? "✅ Blood request cancelled." : "That request was not found, already cancelled, or does not belong to this Telegram chat.");
      break;
    }
    default:
      await sendTelegramMessage(chatId, helpText, telegramEntryKeyboard());
  }
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  // ponytail: mock stubs only outbound sends — webhook auth is always enforced
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  }
  let update: TelegramUpdate;
  try {
    update = await req.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid Telegram update" }, { status: 400 });
  }
  const callback = update.callback_query;
  const data = callback?.data;
  // ponytail: callback dispatch must never throw — Telegram retries non-200s, which double-creates; always 200 + answer
  if (callback && data) {
  try {
  if (data === "donate" && callback?.message) {
    await answerCallbackQuery(callback.id, "Starting donor registration");
    await startDonorFlow(String(callback.message.chat.id));
  } else if (data === "need_blood" && callback?.message) {
    await answerCallbackQuery(callback.id, "Starting blood request");
    await startRequesterFlow(String(callback.message.chat.id));
  } else if (data?.startsWith("blood:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const group = data.slice(6);
    await answerCallbackQuery(callback.id, "Blood group selected");
    // ponytail: taps leave no user-side message, so echo the choice before the next question
    await sendTelegramMessage(chatId, `You selected: ${group}`);
    if ((await getTelegramConversation(chatId))?.state === "request_blood_group") await handleRequesterFlow(chatId, group);
    else await handleDonorFlow(chatId, group);
  } else if (data?.startsWith("req_units:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const units = data.slice("req_units:".length);
    await answerCallbackQuery(callback.id, "Units selected");
    await sendTelegramMessage(chatId, `You selected: ${units} unit${units === "1" ? "" : "s"}`);
    await handleRequesterFlow(chatId, units);
  } else if (data?.startsWith("request:urgency:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const urgency = data.slice("request:urgency:".length);
    const label = urgency === "ROUTINE" ? "Routine · within 24–48h" : urgency === "URGENT" ? "Urgent · within 6–12h" : "Emergency · immediate";
    await answerCallbackQuery(callback.id, "Urgency selected");
    await sendTelegramMessage(chatId, `You selected: ${label}`);
    await handleRequesterFlow(chatId, urgency);
  } else if (data === "request:editmenu" && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, "What do you want to change?");
    await showRequestMenu(chatId, callback.message.message_id);
  } else if (data === "request:review" && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, "Back to review");
    await showRequestReview(chatId, callback.message.message_id);
  } else if (data?.startsWith("request:confirm:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, data.endsWith(":yes") ? "Creating request" : "Request cancelled");
    await handleRequesterFlow(chatId, data.endsWith(":yes") ? "yes" : "no");
  } else if (data?.startsWith("request:edit:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, "What should it be instead?");
    await handleRequestEdit(chatId, data.slice("request:edit:".length));
  } else if (data?.startsWith("consent:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, data === "consent:yes" ? "Consent recorded" : "Registration cancelled");
    await handleDonorFlow(chatId, data === "consent:yes" ? "yes" : "no");
  } else if (data === "calnoop" && callback) {
    await answerCallbackQuery(callback.id, "");
  } else if (data?.startsWith("calnav:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const match = data.slice("calnav:".length).match(/^(\d{4})-(\d{2})$/);
    if (match && callback.message.message_id) {
      await answerCallbackQuery(callback.id, "");
      try {
        await editTelegramCalendar(chatId, callback.message.message_id, "When was your last donation? Tap a date below, or type it as day month year (for example 28 02 2005), or type none.", donationCalendarKeyboard(Number(match[1]), Number(match[2])));
      } catch (error) {
        console.error(JSON.stringify({ event: "telegram_calendar_nav_failed", error: errText(error) }));
      }
    } else if (callback) await answerCallbackQuery(callback.id, "");
  } else if (data?.startsWith("calday:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const picked = data.slice("calday:".length);
    // ponytail: reuse the text path — calendar emits exact dates, the normalizer re-validates them
    const conversation = await getTelegramConversation(chatId);
    if (conversation?.state === "donor_fit_pregdate") {
      if (picked === "skip" || picked === "none") {
        await answerCallbackQuery(callback.id, "Skipped");
        await handleDonorFlow(chatId, "skip");
      } else {
        const iso = normalizeCalendarDate(picked);
        if (!iso) {
          await answerCallbackQuery(callback.id, "That date is not valid");
        } else {
          await answerCallbackQuery(callback.id, "Date selected");
          await sendTelegramMessage(chatId, `You selected: ${formatDisplayDate(iso)}`);
          await handleDonorFlow(chatId, `${Number(iso.slice(8, 10))} ${Number(iso.slice(5, 7))} ${iso.slice(0, 4)}`);
        }
      }
    } else if (conversation?.state !== "donor_last_donation" && conversation?.state !== "donor_date_confirm") {
      if (callback) await answerCallbackQuery(callback.id, "");
    } else if (picked === "none") {
      await answerCallbackQuery(callback.id, "No previous donation");
      await handleDonorFlow(chatId, "none");
    } else {
      const iso = normalizeCalendarDate(picked);
      if (!iso) {
        await answerCallbackQuery(callback.id, "That date is not valid");
      } else {
        await answerCallbackQuery(callback.id, "Date selected");
        // ponytail: instant visible reaction — the pick lands in chat, then the confirm question follows
        await sendTelegramMessage(chatId, `You selected: ${formatDisplayDate(iso)}`);
        const [y, m, d] = iso.split("-").map(Number);
        await handleDonorFlow(chatId, `${d} ${m} ${y}`);
      }
    }
  } else if (data?.startsWith("donor:donated:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, data.endsWith(":yes") ? "Showing calendar" : "Skipping date");
    await handleDonorFlow(chatId, data.endsWith(":yes") ? "yes" : "no");
  } else if (data?.startsWith("donor:date:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, data.endsWith(":yes") ? "Date confirmed" : "Choose another date");
    await handleDonorFlow(chatId, data.endsWith(":yes") ? "yes" : "change");
  } else if (data === "donor:editmenu" && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, "What do you want to change?");
    await showDonorMenu(chatId, callback.message.message_id);
  } else if (data === "donor:review" && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, "Back to review");
    await showDonorReview(chatId, callback.message.message_id);
  } else if (data?.startsWith("fit:sex:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const choice = data.slice("fit:sex:".length);
    await answerCallbackQuery(callback.id, "Noted");
    await handleDonorFlow(chatId, choice);
  } else if (data?.startsWith("fit:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const choice = data.slice(data.lastIndexOf(":") + 1);
    await answerCallbackQuery(callback.id, "Noted");
    await handleDonorFlow(chatId, choice);
  } else if (data?.startsWith("donor:edit:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, "What should it be instead?");
    await handleDonorEdit(chatId, data.slice("donor:edit:".length));
  } else if (data?.startsWith("donor:confirm:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, data.endsWith(":yes") ? "Registration confirmed" : "Registration cancelled");
    await handleDonorFlow(chatId, data.endsWith(":yes") ? "yes" : "no");
  } else if (data?.startsWith("yes:") || data?.startsWith("accept:")) {
    try {
      const chatId = callback?.message ? String(callback.message.chat.id) : undefined;
      if (!chatId) throw new Error("Telegram chat context is missing");
      const result = await acceptNotification(data.slice(data.indexOf(":") + 1), undefined, chatId);
      if (callback) await answerCallbackQuery(callback.id, "Match confirmed. Contact exchange is enabled.");
      if (callback?.message) await sendTelegramMessage(String(callback.message.chat.id), `🎉 Match confirmed with ${result.request.hospital}. Contact exchange is enabled.`);
    } catch (error) {
      if (callback) await answerCallbackQuery(callback.id, error instanceof Error ? error.message : "Unable to accept");
    }
  } else if (data?.startsWith("no:")) {
    try {
      const chatId = callback?.message ? String(callback.message.chat.id) : undefined;
      if (!chatId) throw new Error("Telegram chat context is missing");
      await declineNotification(data.slice(3), chatId);
      if (callback) await answerCallbackQuery(callback.id, "No problem. You will not be contacted again for this request.");
    } catch (error) {
      if (callback) await answerCallbackQuery(callback.id, error instanceof Error ? error.message : "Unable to decline");
    }
  } else if (data === "help" && callback?.message) {
    await answerCallbackQuery(callback.id, "Here are the available BloodLink actions.");
    await sendTelegramMessage(String(callback.message.chat.id), helpText, telegramEntryKeyboard());
  }
  } catch (error) {
    console.error(JSON.stringify({ event: "telegram_callback_failed", error: errText(error) }));
    try { await answerCallbackQuery(callback.id, "Something went wrong, please try again."); } catch { /* ponytail: answer is best-effort */ }
  }
  }
  if (update.message) {
    try {
      try {
        await configureTelegramBot(commands);
      } catch (error) {
        console.error(JSON.stringify({ event: "telegram_menu_setup_failed", error: errText(error) }));
      }
      await handleMessage(String(update.message.chat.id), update.message.text, update.message.location);
    } catch (error) {
      console.error(JSON.stringify({ event: "telegram_update_failed", error: errText(error) }));
      return NextResponse.json({ error: "Telegram update could not be handled" }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true });
}
