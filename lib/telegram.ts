import "server-only";
import { bloodGroups } from "@/lib/domain";

type TelegramApiResponse<T> = { ok: true; result: T } | { ok: false; description?: string };
type InlineKeyboard = { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> };
type ReplyKeyboard = { keyboard: Array<Array<{ text: string; request_location?: boolean }>>; resize_keyboard?: boolean; one_time_keyboard?: boolean };
export type TelegramCommand = { command: string; description: string };

function configured(): boolean { return process.env.MOCK_TELEGRAM === "false" && Boolean(process.env.TELEGRAM_BOT_TOKEN); }
// ponytail: truncate PII — never log full chat ids
function chatHash(chatId: string): string { return `***${String(chatId).slice(-4)}`; }
let menuConfigured=false;
async function api<T>(method:string, body:Record<string, unknown>):Promise<T>{
  const token=process.env.TELEGRAM_BOT_TOKEN;
  if(!token) throw new Error("Telegram bot token is not configured");
  // ponytail: 8s timeout + single 429/5xx retry; final failure throws so caller marks FAILED
  for(let attempt=0;attempt<2;attempt++){
    const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
    if((response.status===429||response.status>=500)&&attempt===0){
      await new Promise(r=>setTimeout(r,300));
      continue;
    }
    const payload=await response.json() as TelegramApiResponse<T>;
    if(!response.ok||!payload.ok) throw new Error(`Telegram ${method} failed: ${payload.ok ? "unknown error" : payload.description ?? "unknown error"}`);
    return payload.result;
  }
  throw new Error(`Telegram ${method} failed: retryable status`);
}

export async function sendDonationRequest(input:{chatId:string; bloodGroup:string; hospital:string; distanceKm:number; urgency:string; actionToken:string}):Promise<"sent"|"mock"|"skipped">{
  if(!configured()){console.info(JSON.stringify({event:"telegram_mock_notification",chatHash:chatHash(input.chatId)}));return "mock";}
  if(!/^-?\d+$/.test(input.chatId)){console.warn(JSON.stringify({event:"telegram_notification_skipped",chatHash:chatHash(input.chatId),reason:"Donor has no verified Telegram chat id"}));return "skipped";}
  const keyboard:InlineKeyboard={inline_keyboard:[[{text:"YES, I CAN DONATE",callback_data:`yes:${input.actionToken}`},{text:"NO",callback_data:`no:${input.actionToken}`}]]};
  await api("sendMessage",{chat_id:input.chatId,text:`🩸 BLOOD REQUEST\n\n${input.bloodGroup} needed\n🏥 ${input.hospital}\n📍 Approximately ${input.distanceKm.toFixed(1)} km away\n🚨 ${input.urgency}\n\nYou appear eligible based on your registered information. Final eligibility is decided by the blood bank.\n\nCan you donate?`,reply_markup:keyboard});
  console.info(JSON.stringify({event:"notification_sent",chatHash:chatHash(input.chatId)}));return "sent";
}
export async function sendTelegramMessage(chatId:string,text:string,replyMarkup?:InlineKeyboard):Promise<void>{if(configured())await api("sendMessage",{chat_id:chatId,text,...(replyMarkup?{reply_markup:replyMarkup}:{})});}
export async function sendTelegramReplyKeyboard(chatId:string,text:string,replyMarkup?:ReplyKeyboard):Promise<void>{if(configured())await api("sendMessage",{chat_id:chatId,text,...(replyMarkup?{reply_markup:replyMarkup}:{})});}
export async function answerCallbackQuery(callbackQueryId:string,text:string):Promise<void>{if(configured())await api("answerCallbackQuery",{callback_query_id:callbackQueryId,text,show_alert:false});}
export async function verifyTelegramBot():Promise<{username:string}> { return api<{username:string}>("getMe",{}); }
export async function configureTelegramBot(commands:TelegramCommand[]):Promise<void>{
  if(!configured()||menuConfigured) return;
  await api("setMyCommands",{commands});
  await api("setChatMenuButton",{menu_button:{type:"commands"}});
  menuConfigured=true;
}
export function telegramEntryKeyboard():InlineKeyboard{
  return {inline_keyboard:[
    [{text:"I want to donate",callback_data:"donate"},{text:"I need blood",callback_data:"need_blood"}],
    [{text:"Help",callback_data:"help"}],
  ]};
}
export function bloodGroupKeyboard():InlineKeyboard {
  const rows: Array<Array<{text:string; callback_data:string}>> = [];
  for (let index = 0; index < bloodGroups.length; index += 3) {
    rows.push(bloodGroups.slice(index, index + 3).map(group => ({ text: group, callback_data: `blood:${group}` })));
  }
  return { inline_keyboard: rows };
}
export function consentKeyboard():InlineKeyboard {
  return { inline_keyboard: [[
    { text: "Yes, I agree", callback_data: "consent:yes" },
    { text: "No, cancel", callback_data: "consent:no" },
  ]] };
}
export function requesterUrgencyKeyboard():InlineKeyboard {
  return { inline_keyboard: [
    [{ text: "Routine · within 24–48h", callback_data: "request:urgency:ROUTINE" }],
    [{ text: "Urgent · within 6–12h", callback_data: "request:urgency:URGENT" }],
    [{ text: "Emergency · immediate", callback_data: "request:urgency:EMERGENCY" }],
  ] };
}
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ponytail: Telegram has no native date picker; month grid with prev/next nav edited in place.
// Nav clamps to 1900-01..current month so no future donation date can be tapped.
export function donationCalendarKeyboard(year: number, month: number): InlineKeyboard {
  const now = new Date();
  let y = Math.min(Math.max(year, 1900), now.getFullYear());
  let m = Math.min(Math.max(month, 1), 12);
  if (y === now.getFullYear() && m > now.getMonth() + 1) m = now.getMonth() + 1;
  const prev = m === 1 ? { y: Math.max(y - 1, 1900), m: 12 } : { y, m: m - 1 };
  const next = (y === now.getFullYear() && m === now.getMonth() + 1) ? { y, m } : (m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 });
  const pad = (n: number) => String(n).padStart(2, "0");
  const rows: InlineKeyboard["inline_keyboard"] = [[
    { text: "‹", callback_data: `calnav:${prev.y}-${pad(prev.m)}` },
    { text: `${monthNames[m - 1]} ${y}`, callback_data: "calnoop" },
    { text: "›", callback_data: `calnav:${next.y}-${pad(next.m)}` },
  ]];
  const blanks = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  let row: Array<{ text: string; callback_data?: string }> = [];
  for (let i = 0; i < blanks; i++) row.push({ text: "·", callback_data: "calnoop" });
  for (let d = 1; d <= days; d++) {
    row.push({ text: String(d), callback_data: `calday:${y}-${pad(m)}-${pad(d)}` });
    if (row.length === 7) { rows.push(row); row = []; }
  }
  if (row.length) { while (row.length < 7) row.push({ text: "·", callback_data: "calnoop" }); rows.push(row); }
  rows.push([{ text: "No previous donation", callback_data: "calday:none" }]);
  return { inline_keyboard: rows };
}

export async function editTelegramMessage(chatId: string, messageId: number, text: string, replyMarkup: InlineKeyboard): Promise<void> {
  if (configured()) await api("editMessageText", { chat_id: chatId, message_id: messageId, text, reply_markup: replyMarkup });
}

export async function editTelegramCalendar(chatId: string, messageId: number, text: string, replyMarkup: InlineKeyboard): Promise<void> {
  await editTelegramMessage(chatId, messageId, text, replyMarkup);
}

// ponytail: taps don't appear as user messages, so every button choice is echoed back visibly
export function unitsKeyboard(): InlineKeyboard {
  const row = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => ({ text: String(from + i), callback_data: `req_units:${from + i}` }));
  return { inline_keyboard: [row(1, 5), row(6, 10)] };
}

// ponytail: fitness Q&A mirrors the web form — one question at a time, skip always allowed
export function fitSexKeyboard():InlineKeyboard {
  return { inline_keyboard: [[
    { text: "Male", callback_data: "fit:sex:male" },
    { text: "Female", callback_data: "fit:sex:female" },
    { text: "Other", callback_data: "fit:sex:other" },
    { text: "Skip", callback_data: "fit:sex:skip" },
  ]] };
}

export function fitYesNoKeyboard(field: string):InlineKeyboard {
  return { inline_keyboard: [[
    { text: "✅ Yes", callback_data: `fit:${field}:yes` },
    { text: "❌ No", callback_data: `fit:${field}:no` },
    { text: "Skip", callback_data: `fit:${field}:skip` },
  ]] };
}

// ponytail: date step starts with a gate — calendar only appears for prior donors
export function donatedKeyboard():InlineKeyboard {
  return { inline_keyboard: [[
    { text: "✅ Yes", callback_data: "donor:donated:yes" },
    { text: "❌ No", callback_data: "donor:donated:no" },
  ]] };
}

export function dateConfirmKeyboard():InlineKeyboard {
  return { inline_keyboard: [[
    { text: "✅ Yes, correct", callback_data: "donor:date:yes" },
    { text: "✏️ Change date", callback_data: "donor:date:change" },
  ]] };
}

// ponytail: two-level edit — review shows Edit, Edit swaps in the field menu, field jumps back to one step
export function donorReviewKeyboard():InlineKeyboard {
  return { inline_keyboard: [[
    { text: "✅ Register me", callback_data: "donor:confirm:yes" },
    { text: "✏️ Edit", callback_data: "donor:editmenu" },
    { text: "❌ Cancel", callback_data: "donor:confirm:no" },
  ]] };
}

export function donorEditMenuKeyboard():InlineKeyboard {
  return { inline_keyboard: [
    [
      { text: "✏️ Name", callback_data: "donor:edit:name" },
      { text: "✏️ Email", callback_data: "donor:edit:contact" },
      { text: "✏️ Blood group", callback_data: "donor:edit:blood" },
    ],
    [
      { text: "✏️ Last donation", callback_data: "donor:edit:last" },
      { text: "✏️ Location", callback_data: "donor:edit:location" },
    ],
    [{ text: "✏️ Fitness answers", callback_data: "donor:edit:fitness" }],
    [{ text: "« Back to review", callback_data: "donor:review" }],
  ] };
}

export function requesterConfirmationKeyboard():InlineKeyboard {
  return { inline_keyboard: [[
    { text: "✅ Create request", callback_data: "request:confirm:yes" },
    { text: "✏️ Edit", callback_data: "request:editmenu" },
    { text: "❌ Cancel", callback_data: "request:confirm:no" },
  ]] };
}

export function requesterEditMenuKeyboard():InlineKeyboard {
  return { inline_keyboard: [
    // ponytail: per-field edit jumps back to that step (data kept); answering flows forward to review again
    [
      { text: "✏️ Name", callback_data: "request:edit:name" },
      { text: "✏️ Contact", callback_data: "request:edit:contact" },
      { text: "✏️ Blood group", callback_data: "request:edit:blood" },
    ],
    [
      { text: "✏️ Units", callback_data: "request:edit:units" },
      { text: "✏️ Urgency", callback_data: "request:edit:urgency" },
      { text: "✏️ Hospital", callback_data: "request:edit:hospital" },
    ],
    [
      { text: "✏️ Location", callback_data: "request:edit:location" },
      { text: "« Back to review", callback_data: "request:review" },
    ],
  ] };
}
