"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { label, timeAgo, timestamp, type DonorRow, type MatchRow, type NotificationRow, type RequestRow } from "./stats";

function Drawer({ title, sub, onClose, children }: { title: string; sub: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="ax-drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.aside
        className="ax-drawer" role="dialog" aria-label={title}
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === "Escape") onClose(); }}
      >
        <div className="ax-drawer-head">
          <div><h2>{title}</h2><p>{sub}</p></div>
          <button type="button" className="ax-iconbtn" onClick={onClose} aria-label="Close details"><X size={17} /></button>
        </div>
        {children}
      </motion.aside>
    </motion.div>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="ax-facts">
      {rows.map(([term, value]) => (
        <div key={term}><dt>{term}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}

export function RequestDrawer({ request, notifications, match, onClose }: {
  request: RequestRow; notifications: NotificationRow[]; match: MatchRow | undefined; onClose: () => void;
}) {
  const waves = notifications.filter(n => n.request_id === request.id).sort((a, b) => a.wave_number - b.wave_number || +new Date(a.sent_at) - +new Date(b.sent_at));
  return (
    <Drawer title={`${request.blood_group} × ${request.units_required}`} sub={`${request.hospital} · opened ${timeAgo(request.created_at)}`} onClose={onClose}>
      <Facts rows={[
        ["Status", <span key="s" className={`status-tag ${label(request.status)}`}>{label(request.status)}</span>],
        ["Urgency", label(request.urgency)],
        ["Hospital", request.hospital],
        ["Units required", request.units_required],
        ["Opened", timestamp(request.created_at)],
        ["Connection", match ? `Linked ${timeAgo(match.created_at)}` : "No donor linked yet"],
      ]} />
      <h3 className="ax-drawer-h">Notification waves · {waves.length}</h3>
      {!waves.length ? <p className="empty-state">No waves sent for this request yet.</p> : (
        <ol className="timeline">
          {waves.map(wave => (
            <li key={wave.id} className={`timeline-item${wave.response === "ACCEPTED" ? " timeline-item--good" : wave.response === "DECLINED" || wave.response === "FAILED" ? " timeline-item--bad" : ""}`}>
              <span>Wave {wave.wave_number} · {label(wave.response)}</span>
              <small>{wave.responded_at ? timeAgo(wave.responded_at) : timeAgo(wave.sent_at)}</small>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}

export function DonorDrawer({ donor, notifications, onClose }: {
  donor: DonorRow; notifications: NotificationRow[]; onClose: () => void;
}) {
  const history = notifications.filter(n => n.donor_id === donor.id).sort((a, b) => +new Date(b.sent_at) - +new Date(a.sent_at));
  const accepted = history.filter(n => n.response === "ACCEPTED").length;
  return (
    <Drawer title={donor.name} sub={`${donor.blood_group} donor · joined ${timeAgo(donor.created_at)}`} onClose={onClose}>
      <Facts rows={[
        ["Availability", <span key="a" className={`status-tag ${label(donor.availability_status)}`}>{label(donor.availability_status)}</span>],
        ["Blood group", donor.blood_group],
        ["Alerts", donor.notification_consent ? "Opted in" : "Opted out"],
        ["Telegram", donor.telegram_connected ? "Linked" : "Not linked"],
        ["Responses", `${accepted} accepted · ${history.length} total`],
      ]} />
      <h3 className="ax-drawer-h">Alert history · {history.length}</h3>
      {!history.length ? <p className="empty-state">No alerts sent to this donor yet.</p> : (
        <ol className="timeline">
          {history.slice(0, 20).map(n => (
            <li key={n.id} className={`timeline-item${n.response === "ACCEPTED" ? " timeline-item--good" : n.response === "DECLINED" || n.response === "FAILED" ? " timeline-item--bad" : ""}`}>
              <span>Wave {n.wave_number} · {label(n.response)}</span>
              <small>{n.responded_at ? timeAgo(n.responded_at) : timeAgo(n.sent_at)}</small>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}

export function DrawerRoot({ children }: { children: React.ReactNode }) {
  return <AnimatePresence>{children}</AnimatePresence>;
}
