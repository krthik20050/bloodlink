"use client";

import { useMemo, useState } from "react";
import { label, timeAgo, type DonorRow, type RequestRow } from "./stats";

export function RequestsTable({ rows, initialQuery }: { rows: RequestRow[]; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [urgency, setUrgency] = useState("ALL");
  const filtered = useMemo(() => rows.filter(r =>
    (urgency === "ALL" || r.urgency === urgency) &&
    `${r.hospital} ${r.blood_group} ${r.status} ${r.urgency}`.toLowerCase().includes(query.toLowerCase())
  ), [rows, query, urgency]);
  return (
    <div>
      <div className="ax-filters">
        <input className="ax-input" type="search" placeholder="Filter hospital, group, status…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Filter requests" />
        <div className="ax-pills" role="group" aria-label="Urgency filter">
          {["ALL", "EMERGENCY", "URGENT", "ROUTINE"].map(u => (
            <button key={u} type="button" onClick={() => setUrgency(u)} aria-pressed={urgency === u} className={`ax-pill${urgency === u ? " ax-pill--on" : ""}`}>{u === "ALL" ? "All" : label(u)}</button>
          ))}
        </div>
      </div>
      <p className="ax-count">{filtered.length} of {rows.length} requests</p>
      <div className="ax-rows">
        {filtered.map(r => (
          <div className="ax-row" key={r.id}>
            <span className="ax-drop" aria-hidden="true">{r.blood_group}</span>
            <div><strong>× {r.units_required} unit(s) · {label(r.urgency)}</strong><small>{r.hospital} · {timeAgo(r.created_at)}</small></div>
            <span className={`status-tag ${label(r.status)}`}>{label(r.status)}</span>
          </div>
        ))}
        {!filtered.length && <p className="empty-state">No requests match these filters.</p>}
      </div>
    </div>
  );
}

export function DonorsTable({ rows, initialQuery }: { rows: DonorRow[]; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("ALL");
  const filtered = useMemo(() => rows.filter(d =>
    (filter === "ALL" || d.availability_status === filter || (filter === "LINKED" && d.telegram_connected)) &&
    `${d.name} ${d.blood_group} ${d.availability_status}`.toLowerCase().includes(query.toLowerCase())
  ), [rows, query, filter]);
  return (
    <div>
      <div className="ax-filters">
        <input className="ax-input" type="search" placeholder="Filter name, group, status…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Filter donors" />
        <div className="ax-pills" role="group" aria-label="Availability filter">
          {[["ALL", "All"], ["AVAILABLE", "Available"], ["PAUSED", "Paused"], ["LINKED", "Telegram-linked"]].map(([v, text]) => (
            <button key={v} type="button" onClick={() => setFilter(v)} aria-pressed={filter === v} className={`ax-pill${filter === v ? " ax-pill--on" : ""}`}>{text}</button>
          ))}
        </div>
      </div>
      <p className="ax-count">{filtered.length} of {rows.length} donors</p>
      <div className="ax-rows">
        {filtered.map(d => (
          <div className="ax-row" key={d.id}>
            <span className="ax-drop" aria-hidden="true">{d.blood_group}</span>
            <div><strong>{d.name}</strong><small>{d.telegram_connected ? "Telegram linked" : "Not linked"} · {d.notification_consent ? "alerts on" : "alerts off"} · joined {timeAgo(d.created_at)}</small></div>
            <span className={`status-tag ${label(d.availability_status)}`}>{label(d.availability_status)}</span>
          </div>
        ))}
        {!filtered.length && <p className="empty-state">No donors match these filters.</p>}
      </div>
    </div>
  );
}
