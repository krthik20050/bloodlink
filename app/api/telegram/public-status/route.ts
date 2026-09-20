import { NextResponse } from "next/server";

export async function GET() {
  const username = process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot";
  const configured = process.env.MOCK_TELEGRAM === "false" && Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const mock = process.env.MOCK_TELEGRAM !== "false";
  return NextResponse.json(
    { username, configured, mock },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
