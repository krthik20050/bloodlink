// ponytail: pure view-model builders shared by the admin views; no hooks here.
export type RequestRow = { id: string; blood_group: string; units_required: number; hospital: string; urgency: string; status: string; created_at: string };
export type DonorRow = { id: string; name: string; blood_group: string; availability_status: string; notification_consent: boolean; telegram_connected: boolean; created_at: string };
export type NotificationRow = { id: string; request_id: string; donor_id: string; wave_number: number; response: string; sent_at: string; responded_at: string | null };
export type MatchRow = { id: string; request_id: string; created_at: string };

export const GROUPS = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
export const STALE_HOURS = 48;

export const label = (value: string) => value.toLowerCase().replace("_", " ");
export const timestamp = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function timeAgo(value: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarizeView(requests: RequestRow[], donors: DonorRow[], notifications: NotificationRow[], matches: MatchRow[]) {
  const open = requests.filter(r => r.status === "OPEN");
  const emergency = open.filter(r => r.urgency === "EMERGENCY");
  const stale = open.filter(r => (Date.now() - new Date(r.created_at).getTime()) / 3600000 > STALE_HOURS);
  const unitsNeeded = open.reduce((sum, r) => sum + r.units_required, 0);
  const matched = requests.filter(r => r.status === "MATCHED").length;
  const matchRate = requests.length ? Math.round((matched / requests.length) * 100) : 0;
  const responseHrs = notifications
    .filter(n => n.responded_at)
    .map(n => (new Date(n.responded_at as string).getTime() - new Date(n.sent_at).getTime()) / 3600000);
  const board = GROUPS.map(group => ({
    group,
    openUnits: open.filter(r => r.blood_group === group).reduce((sum, r) => sum + r.units_required, 0),
    available: donors.filter(d => d.blood_group === group && d.availability_status === "AVAILABLE").length,
    total: donors.filter(d => d.blood_group === group).length,
  }));
  return { open, emergency, stale, unitsNeeded, matched, matchRate, medianResponseHrs: median(responseHrs), board };
}

export function buildActivity(requests: RequestRow[], donors: DonorRow[], matches: MatchRow[]) {
  const days: string[] = [];
  const req: number[] = [];
  const don: number[] = [];
  const mat: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push(new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    req.push(requests.filter(r => r.created_at.slice(0, 10) === day).length);
    don.push(donors.filter(d => d.created_at.slice(0, 10) === day).length);
    mat.push(matches.filter(m => m.created_at.slice(0, 10) === day).length);
  }
  return { days, req, don, mat };
}

export function buildTimeline(requests: RequestRow[], donors: DonorRow[], notifications: NotificationRow[], matches: MatchRow[]) {
  const events: { at: string; text: string; tone: string }[] = [
    ...requests.map(r => ({ at: r.created_at, text: `Request · ${r.blood_group} × ${r.units_required} — ${r.hospital}`, tone: r.urgency === "EMERGENCY" ? "bad" : r.status === "MATCHED" ? "good" : "" })),
    ...donors.map(d => ({ at: d.created_at, text: `Donor joined · ${d.name} (${d.blood_group})`, tone: "good" })),
    ...matches.map(m => ({ at: m.created_at, text: `Connection made · request …${m.request_id.slice(0, 8)}`, tone: "good" })),
    ...notifications.filter(n => n.responded_at).map(n => ({ at: n.responded_at as string, text: `Donor ${label(n.response)} · wave ${n.wave_number}`, tone: n.response === "ACCEPTED" ? "good" : n.response === "DECLINED" || n.response === "FAILED" ? "bad" : "" })),
  ];
  return events.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}
