import { bloodGroups, type BloodGroup } from "@/lib/domain";

export interface RaktkoshAvailability {
  name: string;
  distanceKm: number;
  bloodGroup: BloodGroup;
  availability: string;
  source: "e-RaktKosh";
  lastUpdated: string;
}

export interface RaktkoshResult {
  rows: RaktkoshAvailability[];
  degraded: boolean;
  reason?: string;
}

type CacheEntry = { expiresAt: number; rows: RaktkoshAvailability[] };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 5_000;
const RETRIES = 1; // ponytail: 2 attempts total, 429/5xx only — no new queue/breaker lib
const OFFICIAL_HOST = "eraktkosh.mohfw.gov.in";

function configuredUrl(): URL | null {
  const raw = process.env.RAKTKOSH_ENDPOINT;
  const stateCode = process.env.RAKTKOSH_STATE_CODE;
  const districtCode = process.env.RAKTKOSH_DISTRICT_CODE;
  if (!raw || !stateCode || !districtCode || !/^\d+$/.test(stateCode) || !/^\d+$/.test(districtCode)) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== OFFICIAL_HOST || url.username || url.password) return null;
    if (!url.pathname.endsWith("/nearbyBB.cnt")) return null;
    return url;
  } catch {
    return null;
  }
}

function available(row: Record<string, unknown>, bloodGroup: BloodGroup): RaktkoshAvailability | null {
  const name = [row.bloodBankName, row.blood_bank_name, row.name, row.bbName].find((x): x is string => typeof x === "string" && x.trim().length >= 2);
  const status = [row.availability, row.status, row.available, row.unitsAvailable, row.unit].find((x) => x !== undefined && x !== null);
  if (!name || status === undefined) return null;
  const text = String(status).trim().toLowerCase();
  const units = typeof status === "number" ? status : Number(text);
  const explicitlyAvailable = (Number.isFinite(units) && units > 0) || /^(available|yes|in stock|true)$/i.test(text);
  if (!explicitlyAvailable) return null;
  return {
    name: name.trim(),
    distanceKm: typeof row.distanceKm === "number" && Number.isFinite(row.distanceKm) ? row.distanceKm : 0,
    bloodGroup,
    availability: Number.isFinite(units) ? `${units} unit${units === 1 ? "" : "s"} available` : "Available",
    source: "e-RaktKosh",
    lastUpdated: new Date().toISOString(),
  };
}

export function parseRaktkoshResponse(value: unknown, bloodGroup: BloodGroup): RaktkoshAvailability[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => row && typeof row === "object" ? [available(row as Record<string, unknown>, bloodGroup)].filter(Boolean) as RaktkoshAvailability[] : []);
}

export async function findRaktkoshAvailability(bloodGroup: BloodGroup): Promise<RaktkoshResult> {
  if (!bloodGroups.includes(bloodGroup)) return { rows: [], degraded: true, reason: "invalid-blood-group" };
  const base = configuredUrl();
  if (!base) return { rows: [], degraded: true, reason: "not-configured" };
  const stateCode = process.env.RAKTKOSH_STATE_CODE!;
  const districtCode = process.env.RAKTKOSH_DISTRICT_CODE!;
  const key = `${stateCode}:${districtCode}:${bloodGroup}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { rows: hit.rows, degraded: false };
  const url = new URL(base);
  url.search = new URLSearchParams({ stateCode, districtCode, bloodGroup }).toString();
  let reason = "unknown";
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      // ponytail: stdlib timeout, no AbortController boilerplate
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { accept: "application/json" }, cache: "no-store" });
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        reason = `upstream-${response.status}`;
        if (attempt < RETRIES) continue;
        console.warn(JSON.stringify({ event: "raktkosh_degraded", reason, attempt }));
        return { rows: [], degraded: true, reason };
      }
      if (!response.ok) {
        reason = `upstream-${response.status}`;
        console.warn(JSON.stringify({ event: "raktkosh_degraded", reason }));
        return { rows: [], degraded: true, reason };
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        reason = "non-json-response";
        console.warn(JSON.stringify({ event: "raktkosh_degraded", reason }));
        return { rows: [], degraded: true, reason };
      }
      const rows = parseRaktkoshResponse(await response.json(), bloodGroup);
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, rows });
      return { rows, degraded: false };
    } catch (error) {
      reason = error instanceof Error ? error.name === "TimeoutError" ? "timeout" : error.message : "fetch-failed";
      console.warn(JSON.stringify({ event: "raktkosh_degraded", reason }));
      return { rows: [], degraded: true, reason };
    }
  }
  console.warn(JSON.stringify({ event: "raktkosh_degraded", reason }));
  return { rows: [], degraded: true, reason };
}
