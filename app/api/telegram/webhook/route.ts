import { NextResponse } from "next/server";
import { bloodGroups, type BloodGroup } from "@/lib/domain";
import { acceptNotification, declineNotification } from "@/lib/match-lifecycle";
import {
  clearTelegramConversation,
  createTelegramDonor,
  disconnectTelegramDonor,
  getRequest,
  getTelegramConversation,
  linkTelegramDonor,
  listDonors,
  saveTelegramConversation,
} from "@/lib/supabase/repository";
import {
  answerCallbackQuery,
  configureTelegramBot,
  sendTelegramMessage,
  sendTelegramReplyKeyboard,
  telegramEntryKeyboard,
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
  { command: "help", description: "Show available actions" },
  { command: "status", description: "Show your donor status" },
  { command: "cancel", description: "Cancel the current flow" },
  { command: "disconnect", description: "Disconnect this Telegram chat" },
];
const helpText = "Use /start to open the menu.\n\nDonate: register directly in Telegram.\nNeed blood: create a request on BloodLink.\n/status: show your linked donor status.\n/cancel: stop the current flow.\n/disconnect: remove this chat from your donor profile.";

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
        await sendTelegramMessage(chatId, `Which blood group do you have?\n\n${bloodGroups.join("  ")}`);
      }
      return true;
    case "donor_blood_group":
      if (!value || !bloodGroups.includes(value as BloodGroup)) {
        await sendTelegramMessage(chatId, `Please send one of: ${bloodGroups.join(", ")}`);
      } else {
        await saveTelegramConversation(chatId, "donor_last_donation", { ...conversation.data, bloodGroup: value });
        await sendTelegramMessage(chatId, "When was your last donation? Send YYYY-MM-DD, or type none.");
      }
      return true;
    case "donor_last_donation":
      if (!value || (!/^none$/i.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
        await sendTelegramMessage(chatId, "Use YYYY-MM-DD, for example 2025-06-14, or type none.");
      } else {
        await saveTelegramConversation(chatId, "donor_location", {
          ...conversation.data,
          lastDonationDate: /^none$/i.test(value) ? null : value,
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
        await sendTelegramMessage(chatId, "I agree to receive relevant blood-donation notifications. Reply YES to confirm or NO to cancel.");
      }
      return true;
    case "donor_consent":
      if (/^no$/i.test(value ?? "")) {
        await clearTelegramConversation(chatId);
        await sendTelegramMessage(chatId, "Registration cancelled. Send /donate whenever you are ready.");
      } else if (!/^yes$/i.test(value ?? "")) {
        await sendTelegramMessage(chatId, "Reply YES to confirm receiving relevant donor notifications, or NO to cancel.");
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
  if (await handleDonorFlow(chatId, text, location)) return;
  const parsed = text ? command(text) : null;
  if (!parsed) {
    await sendTelegramMessage(chatId, helpText, telegramEntryKeyboard());
    return;
  }
  switch (parsed.name) {
    case "donate":
      await startDonorFlow(chatId);
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
      await sendTelegramMessage(chatId, await donorStatus(chatId));
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
  } else if (data?.startsWith("yes:") || data?.startsWith("accept:")) {
    try {
      const result = await acceptNotification(data.slice(data.indexOf(":") + 1));
      if (callback) await answerCallbackQuery(callback.id, "Match confirmed. Contact exchange is enabled.");
      if (callback?.message) await sendTelegramMessage(String(callback.message.chat.id), `🎉 Match confirmed with ${result.request.hospital}. Contact exchange is enabled.`);
    } catch (error) {
      if (callback) await answerCallbackQuery(callback.id, error instanceof Error ? error.message : "Unable to accept");
    }
  } else if (data?.startsWith("no:")) {
    try {
      await declineNotification(data.slice(3));
      if (callback) await answerCallbackQuery(callback.id, "No problem. You will not be contacted again for this request.");
    } catch (error) {
      if (callback) await answerCallbackQuery(callback.id, error instanceof Error ? error.message : "Unable to decline");
    }
  } else if (data === "help" && callback?.message) {
    await answerCallbackQuery(callback.id, "Here are the available BloodLink actions.");
    await sendTelegramMessage(String(callback.message.chat.id), helpText, telegramEntryKeyboard());
  } else if (update.message) {
    try {
      await configureTelegramBot(commands);
      await handleMessage(String(update.message.chat.id), update.message.text, update.message.location);
    } catch (error) {
      console.error(JSON.stringify({ event: "telegram_update_failed", error: error instanceof Error ? error.message : "unknown" }));
      return NextResponse.json({ error: "Telegram update could not be handled" }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true });
}
