import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyTelegramBot } from "@/lib/telegram";

export async function GET(req: Request) {
  if (!await getAuthenticatedUser(req)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const result: {
    telegram: { configured: boolean; botUsername?: string };
    supabase: { configured: boolean; reachable?: boolean };
  } = {
    telegram: { configured: process.env.MOCK_TELEGRAM === "false" && Boolean(process.env.TELEGRAM_BOT_TOKEN) },
    supabase: { configured: isSupabaseConfigured() },
  };
  if (result.telegram.configured) {
    try { result.telegram.botUsername = (await verifyTelegramBot()).username; }
    catch (error) { console.error(JSON.stringify({ event: "telegram_status_failed", error: error instanceof Error ? error.message : "unknown" })); }
  }
  if (result.supabase.configured) {
    try {
      const { error } = await getSupabaseAdmin().from("donors").select("id", { head: true, count: "exact" });
      if (error) throw error;
      result.supabase.reachable = true;
    } catch (error) {
      console.error(JSON.stringify({ event: "supabase_status_failed", error: error instanceof Error ? error.message : "unknown" }));
    }
  }
  return NextResponse.json(result);
}
