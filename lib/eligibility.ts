import { matchingConfig } from "./matching-config";
import type { Donor } from "./domain";
export function nextEligibleDate(lastDonationDate: string | null): Date | null { if (!lastDonationDate) return null; const date = new Date(`${lastDonationDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + matchingConfig.intervalDays); return date; }
export function appearsEligible(lastDonationDate: string | null, now = new Date()): boolean { const next = nextEligibleDate(lastDonationDate); return !next || next <= now; }
// ponytail: fitness fields land via parallel agent — optional access so old donors keep working
export interface FitnessFields { ageYears?: number | null; weightKg?: number | null; hemoglobinGdl?: number | null; systolicBpMmhg?: number | null; diastolicBpMmhg?: number | null; pulseBpm?: number | null; isPregnantNow?: boolean | null; lastPregnancyEndDate?: string | null; isBreastfeedingNow?: boolean | null; illnessAntibiotics14d?: boolean | null; tattooPiercing12m?: boolean | null; alcohol24h?: boolean | null; fitnessDeferUntil?: string | null; fitnessUnverified?: boolean | null }
export type FitnessDonor = Donor & Partial<FitnessFields>;
const toNum = (v: unknown): number | null => { if (v === null || v === undefined || v === "") return null; const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : null; };
const toDate = (v: unknown): Date | null => { if (typeof v !== "string" || !v.trim()) return null; const s = v.trim(); const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(s); return Number.isNaN(d.getTime()) ? null : d; };
export function isFitnessDeferred(donor: FitnessDonor, now = new Date()): { deferred: boolean; reason?: string } {
  const d = donor as unknown as Record<string, unknown>;
  const age = toNum(d.ageYears); if (age !== null && (age < 18 || age > 65)) return { deferred: true, reason: "Age outside eligible range (18-65)" };
  const w = toNum(d.weightKg); if (w !== null && w < 45) return { deferred: true, reason: "Weight below 45 kg minimum" };
  const hb = toNum(d.hemoglobinGdl); if (hb !== null && hb < 12.5) return { deferred: true, reason: "Hemoglobin below 12.5 g/dL minimum" };
  const sys = toNum(d.systolicBpMmhg); if (sys !== null && (sys < 100 || sys > 180)) return { deferred: true, reason: "Systolic BP outside 100-180 mmHg" };
  const dia = toNum(d.diastolicBpMmhg); if (dia !== null && (dia < 50 || dia > 100)) return { deferred: true, reason: "Diastolic BP outside 50-100 mmHg" };
  const pulse = toNum(d.pulseBpm); if (pulse !== null && (pulse < 60 || pulse > 100)) return { deferred: true, reason: "Pulse outside 60-100 bpm" };
  if (d.isPregnantNow === true) return { deferred: true, reason: "Pregnancy — deferred" };
  const pregEnd = toDate(d.lastPregnancyEndDate);
  if (pregEnd) { const cutoff = new Date(now); cutoff.setUTCMonth(cutoff.getUTCMonth() - 12); if (pregEnd >= cutoff) return { deferred: true, reason: "Pregnancy ended within last 12 months — deferred" }; }
  if (d.isBreastfeedingNow === true) return { deferred: true, reason: "Breastfeeding — deferred" };
  if (d.illnessAntibiotics14d === true) return { deferred: true, reason: "Illness/antibiotics in last 14 days — deferred" };
  if (d.tattooPiercing12m === true) return { deferred: true, reason: "Tattoo/piercing in last 12 months — deferred" };
  if (d.alcohol24h === true) return { deferred: true, reason: "Alcohol in last 24 hours — deferred" };
  const until = toDate(d.fitnessDeferUntil); if (until && until > now) return { deferred: true, reason: `Temporary fitness deferral until ${String(d.fitnessDeferUntil)}` };
  return { deferred: false };
}
export function isFitnessUnverified(donor: FitnessDonor): boolean {
  const d = donor as unknown as Record<string, unknown>;
  if (d.fitnessUnverified === true) return true;
  for (const k of ["ageYears", "weightKg", "hemoglobinGdl", "systolicBpMmhg", "diastolicBpMmhg", "pulseBpm", "isPregnantNow", "isBreastfeedingNow", "illnessAntibiotics14d", "tattooPiercing12m", "alcohol24h"] as const) {
    const v = d[k]; if (v === null || v === undefined || v === "") return true;
  }
  return false;
}
