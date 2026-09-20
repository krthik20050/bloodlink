// ponytail: day-first only (DD MM YYYY), any separator mix, 1-2 digit day/month; year-first never accepted
export function normalizeTelegramDonationDate(value: string): string | null | undefined {
  if (/^none$/i.test(value.trim())) return null;
  const match = value.trim().match(/^(\d{1,2})[\/.\-\s]+(\d{1,2})[\/.\-\s]+(\d{4})$/);
  if (!match) return undefined;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

const displayMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ponytail: "2005-02-28" -> "28 February 2005" for echoes and confirmations
export function formatDisplayDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  return `${Number(match[3])} ${displayMonths[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
}

// ponytail: calendar buttons emit exact ISO dates; still re-validated so forged callbacks can't store junk
export function normalizeCalendarDate(value: string): string | undefined {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return value.trim();
}
