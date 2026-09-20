"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { label, timeAgo, type DonorRow, type MatchRow, type NotificationRow, type RequestRow } from "./stats";
import { DonorDrawer, DrawerRoot, RequestDrawer } from "./drawer";
import { toast } from "./toast";

const PAGE_SIZE = 12;
const URGENCY_RANK: Record<string, number> = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2 };

type Sort = { key: string; dir: 1 | -1 };

function downloadCsv(filename: string, headers: string[], lines: (string | number | boolean)[][]) {
  const escape = (cell: string | number | boolean) => `"${String(cell).replace(/"/g, '""')}"`;
  const blob = new Blob([[headers.map(escape).join(","), ...lines.map(line => line.map(escape).join(","))].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${lines.length} rows to CSV.`);
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages < 2) return null;
  return (
    <div className="ax-pager">
      <button type="button" className="ax-iconbtn" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
      <span>Page {page + 1} of {pages}</span>
      <button type="button" className="ax-iconbtn" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
    </div>
  );
}

function SortTh({ label: text, sortKey, sort, onSort }: { label: string; sortKey: string; sort: Sort; onSort: (key: string) => void }) {
  const active = sort.key === sortKey;
  return (
    <th aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(sortKey)}>
        {text} {active ? (sort.dir === 1 ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : null}
      </button>
    </th>
  );
}

export function RequestsExplorer({ rows, notifications, matches, initialQuery, initialSelectedId }: {
  rows: RequestRow[]; notifications: NotificationRow[]; matches: MatchRow[]; initialQuery: string; initialSelectedId: string | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [urgency, setUrgency] = useState("ALL");
  const [sort, setSort] = useState<Sort>({ key: "created_at", dir: -1 });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const matchByRequest = useMemo(() => new Map(matches.map(m => [m.request_id, m])), [matches]);

  const toggleSort = (key: string) => {
    setSort(current => (current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const value = (r: RequestRow): string | number => {
      if (sort.key === "units_required") return r.units_required;
      if (sort.key === "urgency") return URGENCY_RANK[r.urgency] ?? 9;
      if (sort.key === "created_at") return +new Date(r.created_at);
      return (r[sort.key as keyof RequestRow] as string) ?? "";
    };
    return rows
      .filter(r => (urgency === "ALL" || r.urgency === urgency) &&
        `${r.hospital} ${r.blood_group} ${r.status} ${r.urgency}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const left = value(a);
        const right = value(b);
        return (typeof left === "number" ? left - (right as number) : String(left).localeCompare(String(right))) * sort.dir;
      });
  }, [rows, query, urgency, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find(r => r.id === selectedId);

  return (
    <div>
      <div className="ax-filters">
        <input className="ax-input" type="search" placeholder="Filter hospital, group, status…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} aria-label="Filter requests" />
        <div className="ax-pills" role="group" aria-label="Urgency filter">
          {["ALL", "EMERGENCY", "URGENT", "ROUTINE"].map(u => (
            <button key={u} type="button" onClick={() => { setUrgency(u); setPage(0); }} aria-pressed={urgency === u} className={`ax-pill${urgency === u ? " ax-pill--on" : ""}`}>{u === "ALL" ? "All" : label(u)}</button>
          ))}
        </div>
        <button type="button" className="ax-mini" onClick={() => downloadCsv("requests.csv",
          ["blood_group", "units", "hospital", "urgency", "status", "opened"],
          filtered.map(r => [r.blood_group, r.units_required, r.hospital, r.urgency, r.status, r.created_at]))}>
          <Download size={13} /> CSV
        </button>
      </div>
      <p className="ax-count">{filtered.length} of {rows.length} requests · click a row for waves</p>
      <div className="ax-tablewrap">
        <table className="ax-table">
          <thead><tr>
            <SortTh label="Group" sortKey="blood_group" sort={sort} onSort={toggleSort} />
            <SortTh label="Hospital" sortKey="hospital" sort={sort} onSort={toggleSort} />
            <SortTh label="Units" sortKey="units_required" sort={sort} onSort={toggleSort} />
            <SortTh label="Urgency" sortKey="urgency" sort={sort} onSort={toggleSort} />
            <SortTh label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
            <SortTh label="Opened" sortKey="created_at" sort={sort} onSort={toggleSort} />
          </tr></thead>
          <tbody>
            {paged.map(r => (
              <tr key={r.id} onClick={() => setSelectedId(r.id)} className={r.id === selectedId ? "ax-row--sel" : ""} tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter") setSelectedId(r.id); }}>
                <td className="no-label"><span className="ax-drop ax-drop--sm">{r.blood_group}</span></td>
                <td data-label=""><strong>{r.hospital}</strong></td>
                <td data-label="Units">× {r.units_required}</td>
                <td data-label="Urgency">{label(r.urgency)}</td>
                <td data-label="Status"><span className={`status-tag ${label(r.status)}`}>{label(r.status)}</span></td>
                <td data-label="Opened">{timeAgo(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="empty-state">No requests match these filters.</p>}
      </div>
      <Pager page={Math.min(page, pages - 1)} pages={pages} onPage={setPage} />
      <DrawerRoot>
        {selected && <RequestDrawer request={selected} notifications={notifications} match={matchByRequest.get(selected.id)} onClose={() => setSelectedId(null)} />}
      </DrawerRoot>
    </div>
  );
}

export function DonorsExplorer({ rows, notifications, initialQuery, initialSelectedId }: {
  rows: DonorRow[]; notifications: NotificationRow[]; initialQuery: string; initialSelectedId: string | null;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState<Sort>({ key: "created_at", dir: -1 });
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);

  const toggleSort = (key: string) => {
    setSort(current => (current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(0);
  };

  const filtered = useMemo(() => {
    const value = (d: DonorRow): string | number => {
      if (sort.key === "created_at") return +new Date(d.created_at);
      if (sort.key === "notification_consent") return d.notification_consent ? 1 : 0;
      if (sort.key === "telegram_connected") return d.telegram_connected ? 1 : 0;
      return (d[sort.key as keyof DonorRow] as string) ?? "";
    };
    return rows
      .filter(d => (filter === "ALL" || d.availability_status === filter || (filter === "LINKED" && d.telegram_connected)) &&
        `${d.name} ${d.blood_group} ${d.availability_status}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        const left = value(a);
        const right = value(b);
        return (typeof left === "number" ? left - (right as number) : String(left).localeCompare(String(right))) * sort.dir;
      });
  }, [rows, query, filter, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find(d => d.id === selectedId);

  return (
    <div>
      <div className="ax-filters">
        <input className="ax-input" type="search" placeholder="Filter name, group, status…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} aria-label="Filter donors" />
        <div className="ax-pills" role="group" aria-label="Availability filter">
          {[["ALL", "All"], ["AVAILABLE", "Available"], ["PAUSED", "Paused"], ["LINKED", "Telegram-linked"]].map(([v, text]) => (
            <button key={v} type="button" onClick={() => { setFilter(v); setPage(0); }} aria-pressed={filter === v} className={`ax-pill${filter === v ? " ax-pill--on" : ""}`}>{text}</button>
          ))}
        </div>
        <button type="button" className="ax-mini" onClick={() => downloadCsv("donors.csv",
          ["name", "blood_group", "availability", "alerts", "telegram_linked", "joined"],
          filtered.map(d => [d.name, d.blood_group, d.availability_status, d.notification_consent, d.telegram_connected, d.created_at]))}>
          <Download size={13} /> CSV
        </button>
      </div>
      <p className="ax-count">{filtered.length} of {rows.length} donors · click a row for history</p>
      <div className="ax-tablewrap">
        <table className="ax-table">
          <thead><tr>
            <SortTh label="Donor" sortKey="name" sort={sort} onSort={toggleSort} />
            <SortTh label="Group" sortKey="blood_group" sort={sort} onSort={toggleSort} />
            <SortTh label="Status" sortKey="availability_status" sort={sort} onSort={toggleSort} />
            <SortTh label="Alerts" sortKey="notification_consent" sort={sort} onSort={toggleSort} />
            <SortTh label="Linked" sortKey="telegram_connected" sort={sort} onSort={toggleSort} />
            <SortTh label="Joined" sortKey="created_at" sort={sort} onSort={toggleSort} />
          </tr></thead>
          <tbody>
            {paged.map(d => (
              <tr key={d.id} onClick={() => setSelectedId(d.id)} className={d.id === selectedId ? "ax-row--sel" : ""} tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter") setSelectedId(d.id); }}>
                <td data-label=""><strong>{d.name}</strong></td>
                <td className="no-label"><span className="ax-drop ax-drop--sm">{d.blood_group}</span></td>
                <td data-label="Status"><span className={`status-tag ${label(d.availability_status)}`}>{label(d.availability_status)}</span></td>
                <td data-label="Alerts">{d.notification_consent ? "On" : "Off"}</td>
                <td data-label="Linked">{d.telegram_connected ? "Yes" : "No"}</td>
                <td data-label="Joined">{timeAgo(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="empty-state">No donors match these filters.</p>}
      </div>
      <Pager page={Math.min(page, pages - 1)} pages={pages} onPage={setPage} />
      <DrawerRoot>
        {selected && <DonorDrawer donor={selected} notifications={notifications} onClose={() => setSelectedId(null)} />}
      </DrawerRoot>
    </div>
  );
}
