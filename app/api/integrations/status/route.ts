import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { isSupabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyTelegramBot } from "@/lib/telegram";

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    if (!await getAuthenticatedUser(req)) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const result: {
      telegram: { configured: boolean; botUsername?: string; reachable?: boolean };
      supabase: { configured: boolean; reachable?: boolean };
    } = {
      telegram: { configured: process.env.MOCK_TELEGRAM === "false" && Boolean(process.env.TELEGRAM_BOT_TOKEN) },
      supabase: { configured: isSupabaseConfigured() },
    };
    if (result.telegram.configured) {
      try {
        result.telegram.botUsername = (await verifyTelegramBot()).username;
        result.telegram.reachable = true;
      }
      catch (error) {
        result.telegram.reachable = false;
        console.error(JSON.stringify({ event: "telegram_status_failed", requestId, error: error instanceof Error ? error.message : "unknown" }));
      }
    }
    if (result.supabase.configured) {
      try {
        const { error } = await getSupabaseAdmin().from("donors").select("id", { head: true, count: "exact" });
        if (error) throw error;
        result.supabase.reachable = true;
      } catch (error) {
        result.supabase.reachable = false;
        console.error(JSON.stringify({ event: "supabase_status_failed", requestId, error: error instanceof Error ? error.message : "unknown" }));
      }
    }
    // ponytail: fail-loud status — configured-but-unreachable is 503, not 200
    const degraded = (result.telegram.configured && result.telegram.reachable !== true)
      || (result.supabase.configured && result.supabase.reachable !== true);
    console.info(JSON.stringify({ event: "integrations_status", requestId, degraded }));
    return NextResponse.json(result, { status: degraded ? 503 : 200 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error(JSON.stringify({ event: "integrations_status_failed", requestId, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
