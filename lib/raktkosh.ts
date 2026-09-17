import { bloodGroups, type BloodGroup } from "@/lib/domain";

export interface RaktkoshAvailability {
  name: string;
  distanceKm: number;
  bloodGroup: BloodGroup;
  availability: string;
  source: "e-RaktKosh";
  lastUpdated: string;
}

type CacheEntry = { expiresAt: number; rows: RaktkoshAvailability[] };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 5_000;
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

export async function findRaktkoshAvailability(bloodGroup: BloodGroup): Promise<RaktkoshAvailability[]> {
  if (!bloodGroups.includes(bloodGroup)) return [];
  const base = configuredUrl();
  if (!base) return [];
  const stateCode = process.env.RAKTKOSH_STATE_CODE!;
  const districtCode = process.env.RAKTKOSH_DISTRICT_CODE!;
  const key = `${stateCode}:${districtCode}:${bloodGroup}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.rows;
  const url = new URL(base);
  url.search = new URLSearchParams({ stateCode, districtCode, bloodGroup }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) return [];
    const rows = parseRaktkoshResponse(await response.json(), bloodGroup);
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, rows });
    return rows;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
