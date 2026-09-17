import { matchingConfig } from "./matching-config";
export function nextEligibleDate(lastDonationDate: string | null): Date | null { if (!lastDonationDate) return null; const date = new Date(`${lastDonationDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + matchingConfig.intervalDays); return date; }
export function appearsEligible(lastDonationDate: string | null, now = new Date()): boolean { const next = nextEligibleDate(lastDonationDate); return !next || next <= now; }
