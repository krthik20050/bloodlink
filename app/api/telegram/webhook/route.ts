import { NextResponse } from "next/server";
import { bloodGroups, type BloodGroup } from "@/lib/domain";
import { formatTelegramRequest, isTelegramBloodGroup, parseTelegramHospital, parseTelegramUnits, parseTelegramUrgency } from "@/lib/telegram-request";
import { normalizeTelegramDonationDate } from "@/lib/telegram-registration";
import { acceptNotification, declineNotification } from "@/lib/match-lifecycle";
import {
  clearTelegramConversation,
  cancelRequestForRequester,
  createRequest,
  createTelegramDonor,
  disconnectTelegramDonor,
  getOrCreateTelegramRequester,
  getRequest,
  getTelegramConversation,
  linkTelegramDonor,
  listRequestsByRequesterId,
  listDonors,
  saveTelegramConversation,
} from "@/lib/supabase/repository";
import {
  answerCallbackQuery,
  configureTelegramBot,
  sendTelegramMessage,
  sendTelegramReplyKeyboard,
  bloodGroupKeyboard,
  consentKeyboard,
  telegramEntryKeyboard,
  requesterConfirmationKeyboard,
  requesterUrgencyKeyboard,
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
    message?: { chat: { id: number } };
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
  await saveTelegramConversation(chatId, "request_blood_group");
  await sendTelegramMessage(chatId, "🩸 Let’s create a blood request.\n\nWhich blood group is needed?", bloodGroupKeyboard());
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
    case "request_blood_group":
      if (!value || !isTelegramBloodGroup(value)) await sendTelegramMessage(chatId, `Please choose one of: ${bloodGroups.join(", ")}`, bloodGroupKeyboard());
      else {
        await saveTelegramConversation(chatId, "request_units", { bloodGroup: value });
        await sendTelegramMessage(chatId, "How many units are needed? Send a number from 1 to 10.");
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
      if (!location) {
        await sendTelegramReplyKeyboard(chatId, "Please tap “Share hospital location” so nearby donors can be matched.", {
          keyboard: [[{ text: "Share hospital location", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      } else {
        const data: Record<string, string | number | boolean | null> = { ...conversation.data, latitude: location.latitude, longitude: location.longitude };
        await saveTelegramConversation(chatId, "request_confirmation", data);
        await sendTelegramMessage(chatId, `Please confirm:\n\n${String(data["bloodGroup"])} · ${String(data["units"])} unit${Number(data["units"]) === 1 ? "" : "s"} · ${String(data["urgency"])}\n🏥 ${String(data["hospital"])}\n📍 ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`, requesterConfirmationKeyboard());
      }
      return true;
    case "request_confirmation":
      if (!/^yes$/i.test(value ?? "")) {
        if (/^no$/i.test(value ?? "")) {
          await clearTelegramConversation(chatId);
          await sendTelegramMessage(chatId, "Request cancelled. Send /request whenever you need blood.");
        } else await sendTelegramMessage(chatId, "Choose Create request or Cancel.", requesterConfirmationKeyboard());
        return true;
      }
      {
        const data = conversation.data;
        const request = await createRequest({
          requesterId: await requesterId(chatId),
          bloodGroup: data.bloodGroup as BloodGroup,
          unitsRequired: Number(data.units),
          hospital: String(data.hospital),
          location: { latitude: Number(data.latitude), longitude: Number(data.longitude) },
          urgency: data.urgency as "ROUTINE" | "URGENT" | "EMERGENCY",
          status: "OPEN",
          createdAt: new Date().toISOString(),
        });
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
        await sendTelegramMessage(chatId, "When was your last donation? Send DD/MM/YYYY (day/month/year), or type none.");
      }
      return true;
    case "donor_last_donation":
      const normalizedDate = value ? normalizeTelegramDonationDate(value) : undefined;
      if (normalizedDate === undefined) {
        await sendTelegramMessage(chatId, "Use DD/MM/YYYY, for example 28/02/2005, or type none. Please enter a real calendar date.");
      } else {
        await saveTelegramConversation(chatId, "donor_location", {
          ...conversation.data,
          lastDonationDate: normalizedDate,
        });
        await sendTelegramReplyKeyboard(chatId, "Please share your location using the button below. We use it only to find nearby requests.", {
          keyboard: [[{ text: "Share my location", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      }
      return true;
    case "donor_location":
      if (!location) {
        await sendTelegramReplyKeyboard(chatId, "Please tap “Share my location” so we can finish registration.", {
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
        const data = conversation.data;
        const donor = await createTelegramDonor({
          chatId,
          name: String(data.name),
          contact: String(data.contact),
          bloodGroup: data.bloodGroup as BloodGroup,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          lastDonationDate: (data.lastDonationDate as string | null) ?? null,
        });
        await clearTelegramConversation(chatId);
        await sendTelegramMessage(chatId, `✅ You’re registered, ${donor.name}.\n\nWe’ll notify you only about compatible nearby requests. Use /status to check your profile.`);
      }
      return true;
  }
  return true;
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
  if (process.env.MOCK_TELEGRAM !== "true" && (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET)) {
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
  if (data === "donate" && callback?.message) {
    await answerCallbackQuery(callback.id, "Starting donor registration");
    await startDonorFlow(String(callback.message.chat.id));
  } else if (data === "need_blood" && callback?.message) {
    await answerCallbackQuery(callback.id, "Opening blood request");
    const requestUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? ""}/request`;
    await sendTelegramMessage(String(callback.message.chat.id), "Create a blood request on BloodLink:", { inline_keyboard: [[{ text: "Open blood request", url: requestUrl }]] });
  } else if (data?.startsWith("blood:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    const group = data.slice(6);
    await answerCallbackQuery(callback.id, "Blood group selected");
    if ((await getTelegramConversation(chatId))?.state === "request_blood_group") await handleRequesterFlow(chatId, group);
    else await handleDonorFlow(chatId, group);
  } else if (data?.startsWith("request:urgency:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, "Urgency selected");
    await handleRequesterFlow(chatId, data.slice("request:urgency:".length));
  } else if (data?.startsWith("request:confirm:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, data.endsWith(":yes") ? "Creating request" : "Request cancelled");
    await handleRequesterFlow(chatId, data.endsWith(":yes") ? "yes" : "no");
  } else if (data?.startsWith("consent:") && callback?.message) {
    const chatId = String(callback.message.chat.id);
    await answerCallbackQuery(callback.id, data === "consent:yes" ? "Consent recorded" : "Registration cancelled");
    await handleDonorFlow(chatId, data === "consent:yes" ? "yes" : "no");
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
  } else if (update.message) {
    try {
      try {
        await configureTelegramBot(commands);
      } catch (error) {
        console.error(JSON.stringify({ event: "telegram_menu_setup_failed", error: error instanceof Error ? error.message : String(error) }));
      }
      await handleMessage(String(update.message.chat.id), update.message.text, update.message.location);
    } catch (error) {
      console.error(JSON.stringify({ event: "telegram_update_failed", error: error instanceof Error ? error.message : String(error) }));
      return NextResponse.json({ error: "Telegram update could not be handled" }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true });
}
