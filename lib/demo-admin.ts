import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "bloodlink_demo_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  return process.env.DEMO_ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function demoAdminConfigured() {
  return Boolean(process.env.DEMO_ADMIN_LOGIN && process.env.DEMO_ADMIN_PASSWORD && secret());
}

export function demoCredentialsMatch(login: string, password: string) {
  return demoAdminConfigured() &&
    login === process.env.DEMO_ADMIN_LOGIN &&
    password === process.env.DEMO_ADMIN_PASSWORD;
}

export function createDemoAdminToken() {
  const payload = `${Date.now() + MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

function validToken(token: string | undefined) {
  if (!token || !secret()) return false;
  const [expires, provided] = token.split(".");
  if (!expires || !provided || Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hasDemoAdminSession(request?: Request) {
  const token = request
    ? request.headers.get("cookie")?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1]
    : (await cookies()).get(COOKIE_NAME)?.value;
  return validToken(token);
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
