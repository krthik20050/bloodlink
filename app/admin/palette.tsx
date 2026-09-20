"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ClipboardList, LayoutDashboard, LogOut, Search, Users } from "lucide-react";
import type { DonorRow, RequestRow } from "./stats";

type Entry =
  | { kind: "nav"; label: string; hint: string; href: string }
  | { kind: "request"; label: string; hint: string; href: string }
  | { kind: "donor"; label: string; hint: string; href: string };

const NAV: Entry[] = [
  { kind: "nav", label: "Overview", hint: "Dashboard", href: "/admin" },
  { kind: "nav", label: "Requests", hint: "Triage queue", href: "/admin/requests" },
  { kind: "nav", label: "Donors", hint: "Network directory", href: "/admin/donors" },
  { kind: "nav", label: "Activity", hint: "Live feed", href: "/admin/activity" },
  { kind: "nav", label: "Exit admin", hint: "Back to site", href: "/" },
];

const NAV_ICON = { Overview: <LayoutDashboard size={16} />, Requests: <ClipboardList size={16} />, Donors: <Users size={16} />, Activity: <Activity size={16} />, "Exit admin": <LogOut size={16} /> } as const;

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<{ requests: RequestRow[]; donors: DonorRow[] }>({ requests: [], donors: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
    let stop = false;
    Promise.all([
      fetch("/api/admin/requests", { cache: "no-store" }).then(r => (r.ok ? r.json() : [])),
      fetch("/api/admin/donors", { cache: "no-store" }).then(r => (r.ok ? r.json() : [])),
    ]).then(([requests, donors]) => { if (!stop) setRecords({ requests, donors }); })
      .catch(() => { if (!stop) setRecords({ requests: [], donors: [] }); });
    return () => { stop = true; };
  }, [open ]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV;
    const reqs = records.requests
      .filter(r => `${r.hospital} ${r.blood_group} ${r.status} ${r.urgency}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((r): Entry => ({ kind: "request", label: `${r.blood_group} × ${r.units_required} — ${r.hospital}`, hint: r.status.toLowerCase(), href: `/admin/requests?sel=${r.id}` }));
    const dons = records.donors
      .filter(d => `${d.name} ${d.blood_group}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((d): Entry => ({ kind: "donor", label: `${d.name} · ${d.blood_group}`, hint: d.availability_status.toLowerCase(), href: `/admin/donors?sel=${d.id}` }));
    return [...NAV.filter(n => n.label.toLowerCase().includes(q)), ...reqs, ...dons];
  }, [query, records]);

  useEffect(() => setActive(0), [entries.length]);

  function go(entry: Entry) {
    onClose();
    router.push(entry.href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="ax-palette-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="ax-palette" role="dialog" aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.98, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15 }} onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % Math.max(1, entries.length)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a - 1 + entries.length) % Math.max(1, entries.length)); }
              if (e.key === "Enter" && entries[active]) go(entries[active]);
              if (e.key === "Escape") onClose();
            }}
          >
            <div className="ax-palette-input">
              <Search size={16} aria-hidden="true" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Jump to a view or record…" aria-label="Command palette" />
              <kbd>esc</kbd>
            </div>
            <ul className="ax-palette-list">
              {entries.map((entry, i) => (
                <li key={`${entry.kind}-${entry.label}-${i}`}>
                  <button type="button" onClick={() => go(entry)} onMouseMove={() => setActive(i)} className={`ax-palette-item${i === active ? " ax-palette-item--active" : ""}`}>
                    <span className="ax-palette-icon">{entry.kind === "nav" ? NAV_ICON[entry.label as keyof typeof NAV_ICON] ?? null : <span className="ax-drop ax-drop--sm">{entry.kind === "request" ? entry.label.slice(0, 2) : entry.label.charAt(0)}</span>}</span>
                    <span>{entry.label}</span><small>{entry.hint}</small>
                  </button>
                </li>
              ))}
              {!entries.length && <li className="empty-state">No matches. Try a hospital, name, or blood group.</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
