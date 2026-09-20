import Link from "next/link";
import { Clock, Droplets, HeartHandshake, Users } from "lucide-react";
import { getAdminMetrics, listAdminDonors, listAdminMatches, listAdminNotifications, listAdminRequests } from "@/lib/supabase/admin-data";
import { requireAdmin } from "../require-admin";
import { buildActivity, label, summarizeView, timeAgo } from "../stats";
import { ActivityChart, BarList, Donut, PALETTE } from "../charts";

export default async function AdminOverview() {
  await requireAdmin();
  const [metrics, requests, donors, notifications, matches] = await Promise.all([
    getAdminMetrics(), listAdminRequests(), listAdminDonors(), listAdminNotifications(), listAdminMatches(),
  ]);
  const view = summarizeView(requests, donors, notifications, matches);
  const activity = buildActivity(requests, donors, matches);
  const attention = [...view.emergency, ...view.stale.filter(s => s.urgency !== "EMERGENCY")].slice(0, 5);

  return (
    <div>
      <div className="ax-pagehead">
        <div><h1>Dashboard</h1><p>Plan, prioritize, and coordinate every request with ease.</p></div>
        <Link href="/admin/requests" className="ax-cta">+ New triage view</Link>
      </div>

      {(view.emergency.length > 0 || view.stale.length > 0) && (
        <div className="notice notice-error attention-strip" role="alert">
          <strong>Needs attention · {view.emergency.length + view.stale.length}</strong>
          <p>{view.emergency.length > 0 && `${view.emergency.length} emergency request(s) open. `}{view.stale.length > 0 && `${view.stale.length} open request(s) older than 48h. `}<Link href="/admin/requests">Open triage →</Link></p>
        </div>
      )}

      <section className="ax-kpis" aria-label="Key indicators">
        <Kpi icon={<Droplets size={18} />} title="Open requests" value={metrics.requests.open} sub={`${view.emergency.length} emergency · ${view.unitsNeeded} units needed`} accent={view.emergency.length ? "bad" : "good"} delta={`${metrics.requests.total} all time`} />
        <Kpi icon={<HeartHandshake size={18} />} title="Match rate" value={`${view.matchRate}%`} sub={`${view.matched} matched · ${metrics.matches.total} connections`} accent={view.matchRate >= 50 ? "good" : ""} delta="of all requests" />
        <Kpi icon={<Users size={18} />} title="Donor network" value={metrics.donors.total} sub={`${metrics.donors.available} available · ${metrics.donors.connected} linked`} delta="registered donors" />
        <Kpi icon={<Clock size={18} />} title="Median response" value={view.medianResponseHrs ? `${view.medianResponseHrs.toFixed(1)}h` : "—"} sub="sent → donor decision" delta={view.medianResponseHrs ? "across waves" : "no responses yet"} />
      </section>

      <div className="ax-cols">
        <div className="ax-col-main">
          <section className="ax-card" aria-labelledby="board-title">
            <div className="ax-cardhead"><div><h2 id="board-title">Blood board</h2><p>Open demand vs. available donors per group.</p></div><Link href="/admin/donors" className="ax-mini">+ Donors</Link></div>
            <div className="board-tiles">
              {view.board.map(tile => (
                <div key={tile.group} className={`blood-tile${tile.openUnits > 0 && tile.available === 0 ? " blood-tile--gap" : ""}`}>
                  <b>{tile.group}</b>
                  <p><span>{tile.openUnits}u</span> needed</p>
                  <p><span>{tile.available}</span> ready</p>
                  <div className="tile-bar" aria-hidden="true"><i style={{ width: `${tile.total ? (tile.available / tile.total) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="ax-card" aria-labelledby="trend-title">
            <div className="ax-cardhead"><div><h2 id="trend-title">14-day momentum</h2><p>Requests, donors, and connections per day.</p></div></div>
            <ActivityChart days={activity.days} series={[
              { label: "Requests", color: PALETTE.crimson, values: activity.req },
              { label: "Donors", color: PALETTE.blue, values: activity.don },
              { label: "Connections", color: PALETTE.green, values: activity.mat },
            ]} />
          </section>
        </div>

        <div className="ax-col-rail">
          <section className="ax-card" aria-labelledby="outcomes-title">
            <div className="ax-cardhead"><div><h2 id="outcomes-title">Outcomes</h2><p>Where requests stand.</p></div></div>
            <Donut segments={[
              { label: "Open", value: metrics.requests.open, color: PALETTE.crimson },
              { label: "Matched", value: metrics.requests.matched, color: PALETTE.green },
              { label: "Cancelled", value: metrics.requests.cancelled, color: PALETTE.gray },
              { label: "Expired", value: metrics.requests.expired, color: PALETTE.amber },
            ]} />
          </section>

          <section className="ax-card" aria-labelledby="triage-title">
            <div className="ax-cardhead"><div><h2 id="triage-title">Triage now</h2><p>Most urgent open cases.</p></div><Link href="/admin/requests" className="ax-mini">View all</Link></div>
            {!attention.length ? <p className="empty-state">Queue is clear.</p> : attention.map(r => (
              <div className="ax-row" key={r.id}>
                <span className="ax-drop" aria-hidden="true">{r.blood_group}</span>
                <div><strong>× {r.units_required} · {label(r.urgency)}</strong><small>{r.hospital} · {timeAgo(r.created_at)}</small></div>
              </div>
            ))}
          </section>

          <section className="ax-card" aria-labelledby="notify-title">
            <div className="ax-cardhead"><div><h2 id="notify-title">Delivery</h2><p>Donor decisions.</p></div></div>
            <BarList rows={[
              { label: "Pending", value: metrics.notifications.pending, color: PALETTE.amber },
              { label: "Accepted", value: metrics.notifications.accepted, color: PALETTE.green },
              { label: "Declined", value: metrics.notifications.declined, color: PALETTE.red },
              { label: "Failed", value: metrics.notifications.failed, color: PALETTE.ink },
            ]} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, title, value, sub, delta, accent }: { icon: React.ReactNode; title: string; value: React.ReactNode; sub: string; delta: string; accent?: string }) {
  return (
    <div className={`ax-kpi${accent ? ` ax-kpi--${accent}` : ""}`}>
      <span className="ax-kpi-top">{title}<i aria-hidden="true">{icon}</i></span>
      <b>{value}</b>
      <p>{sub}</p>
      <small>{delta}</small>
    </div>
  );
}
