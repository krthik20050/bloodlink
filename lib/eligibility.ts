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
  // ponytail: delegates to the canonical check so form and matcher can never disagree
  const e = evaluateFitness(donor, now);
  return e.blocked ? { deferred: true, reason: e.blocked } : { deferred: false };
}
export function isFitnessUnverified(donor: FitnessDonor): boolean {
  const d = donor as unknown as Record<string, unknown>;
  if (d.fitnessUnverified === true) return true;
  // ponytail: single canonical rule — unknown Hb/BP/pulse only (matches the form)
  return d.hemoglobinGdl == null || d.systolicBpMmhg == null || d.diastolicBpMmhg == null || d.pulseBpm == null;
}

export interface FitnessEvaluation { blocked: string | null; deferUntil: string | null; unverified: boolean }
const fmtDay = (d: Date): string => d.toISOString().slice(0, 10);
const plusDays = (base: Date, n: number): string => { const d = new Date(base.getTime()); d.setUTCDate(d.getUTCDate() + n); return fmtDay(d); };
const plusMonths = (base: Date, n: number): string => { const d = new Date(base.getTime()); d.setUTCMonth(d.getUTCMonth() + n); return fmtDay(d); };
// ponytail: THE canonical fitness check — form preview and matcher both use this; thresholds change here only
export function evaluateFitness(v: FitnessFields, now: Date = new Date()): FitnessEvaluation {
  const d = v as unknown as Record<string, unknown>;
  const num = (k: string): number | null => toNum(d[k]);
  const unverified = num("hemoglobinGdl") == null || num("systolicBpMmhg") == null || num("diastolicBpMmhg") == null || num("pulseBpm") == null;
  const block = (blocked: string, deferUntil: string | null = null): FitnessEvaluation => ({ blocked, deferUntil, unverified });
  const age = num("ageYears");
  if (age != null && (age < 18 || age > 65)) return block("Blood donation is only possible between ages 18 and 65. Please discuss with your blood bank if you have questions.");
  const w = num("weightKg");
  if (w != null && w < 45) return block("A minimum weight of 45 kg is required to donate. Please discuss with your blood bank.");
  const hb = num("hemoglobinGdl");
  if (hb != null && hb < 12.5) return block("Hemoglobin below 12.5 g/dL needs a short deferral. You can register again after the deferred date.", plusDays(now, 90));
  const sys = num("systolicBpMmhg"); const dia = num("diastolicBpMmhg");
  if ((sys != null && (sys < 100 || sys > 180)) || (dia != null && (dia < 50 || dia > 100))) return block("Blood pressure outside 100-180 / 50-100 mmHg needs a deferral. Please discuss with your blood bank.");
  const pulse = num("pulseBpm");
  if (pulse != null && (pulse < 60 || pulse > 100)) return block("Pulse outside 60-100 bpm needs a deferral. Please discuss with your blood bank.");
  if (d.isPregnantNow === true) return block("Donation is deferred during pregnancy and for 12 months after delivery. Please come back then.");
  const pregEndRaw = typeof d.lastPregnancyEndDate === "string" ? d.lastPregnancyEndDate : null;
  if (pregEndRaw) {
    if (pregEndRaw >= plusMonths(now, -12)) return block("Donation is deferred for 12 months after delivery or abortion. You can register again after the deferred date.", plusMonths(new Date(`${pregEndRaw}T00:00:00Z`), 12));
  }
  if (d.isBreastfeedingNow === true) return block("Donation is deferred while breastfeeding. Please discuss with your blood bank.");
  if (d.illnessAntibiotics14d === true) return block("Recent illness or antibiotics need a 14-day deferral. You can register again after the deferred date.", plusDays(now, 14));
  if (d.tattooPiercing12m === true) return block("A tattoo or piercing in the last 12 months needs a 12-month deferral. You can register again after the deferred date.", plusMonths(now, 12));
  if (d.alcohol24h === true) return block("Alcohol in the last 24 hours needs a 24-hour deferral. Please come back tomorrow.", plusDays(now, 1));
  const until = toDate(d.fitnessDeferUntil); if (until && until > now) return block(`Temporary fitness deferral until ${String(d.fitnessDeferUntil)}`);
  return { blocked: null, deferUntil: null, unverified };
}
