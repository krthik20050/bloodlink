import { NextResponse } from "next/server";
import { createDemoAdminToken, COOKIE_NAME, demoCredentialsMatch, MAX_AGE_SECONDS } from "@/lib/demo-admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.login !== "string" || typeof body.password !== "string" || !demoCredentialsMatch(body.login, body.password)) {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, createDemoAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
