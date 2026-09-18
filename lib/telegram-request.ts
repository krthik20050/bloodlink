import { bloodGroups, type BloodGroup, type BloodRequest } from "@/lib/domain";

export const urgencies = ["ROUTINE", "URGENT", "EMERGENCY"] as const;
export type RequestUrgency = (typeof urgencies)[number];

export function parseTelegramUnits(value: string): number | null {
  const units = Number(value.trim());
  return Number.isInteger(units) && units >= 1 && units <= 10 ? units : null;
}

export function parseTelegramUrgency(value: string): RequestUrgency | null {
  const normalized = value.trim().toUpperCase();
  return urgencies.includes(normalized as RequestUrgency) ? normalized as RequestUrgency : null;
}

export function parseTelegramHospital(value: string): string | null {
  const hospital = value.trim();
  return hospital.length >= 2 && hospital.length <= 100 ? hospital : null;
}

export function isTelegramBloodGroup(value: string): value is BloodGroup {
  return bloodGroups.includes(value as BloodGroup);
}

export function formatTelegramRequest(request: BloodRequest): string {
  return `#${request.id.slice(0, 8)} · ${request.bloodGroup} · ${request.unitsRequired} unit${request.unitsRequired === 1 ? "" : "s"} · ${request.urgency}\n🏥 ${request.hospital}\nStatus: ${request.status}`;
}
