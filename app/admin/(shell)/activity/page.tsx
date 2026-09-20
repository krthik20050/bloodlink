import { listAdminDonors, listAdminMatches, listAdminNotifications, listAdminRequests } from "@/lib/supabase/admin-data";
import { requireAdmin } from "../../require-admin";
import { buildTimeline, label, timeAgo } from "../../stats";

const timestampFmt = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function AdminActivity() {
  await requireAdmin();
  const [requests, donors, notifications, matches] = await Promise.all([
    listAdminRequests(), listAdminDonors(), listAdminNotifications(), listAdminMatches(),
  ]);
  const timeline = buildTimeline(requests, donors, notifications, matches);
  const requestById = new Map(requests.map(r => [r.id, r]));
  return (
    <div>
      <div className="ax-pagehead">
        <div><h1>Activity</h1><p>Newest events and every connection made across the network.</p></div>
      </div>
      <div className="ax-cols">
        <section className="ax-card" aria-labelledby="feed-title">
          <div className="ax-cardhead"><div><h2 id="feed-title">Live feed</h2><p>Requests, donors, decisions, connections.</p></div></div>
          <ol className="timeline">
            {!timeline.length ? <p className="empty-state">No activity yet.</p> : timeline.slice(0, 30).map((event, i) => (
              <li key={i} className={`timeline-item${event.tone ? ` timeline-item--${event.tone}` : ""}`}>
                <span>{event.text}</span><small>{timeAgo(event.at)}</small>
              </li>
            ))}
          </ol>
        </section>
        <section className="ax-card" aria-labelledby="conn-title">
          <div className="ax-cardhead"><div><h2 id="conn-title">Connections</h2><p>Donor ↔ request matches.</p></div></div>
          {!matches.length ? <p className="empty-state">No connections yet — matches appear here the moment a donor accepts.</p> : matches.slice(0, 15).map(match => {
            const request = requestById.get(match.request_id);
            return (
              <div className="ax-row" key={match.id}>
                <div><strong>{request ? `${request.blood_group} → ${request.hospital}` : `Request …${match.request_id.slice(0, 8)}`}</strong><small>Connected {timestampFmt(match.created_at)}</small></div>
                <span className="status-tag accepted">linked</span>
              </div>
            );
          })}
          <div className="ax-cardhead" style={{ marginTop: 20 }}><div><h2>Notification log</h2><p>Latest waves, without donor identifiers.</p></div></div>
          {!notifications.length ? <p className="empty-state">No notification activity yet.</p> : notifications.slice(0, 10).map(n => (
            <div className="ax-row" key={n.id}>
              <div><strong>Wave {n.wave_number} · {label(n.response)}</strong><small>Sent {timestampFmt(n.sent_at)}{n.responded_at ? ` · answered ${timeAgo(n.responded_at)}` : ""}</small></div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
