"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChevronsLeft, ChevronsRight, ClipboardList, LayoutDashboard, LogOut, Users, X } from "lucide-react";

export default function AdminNav({ openCount, donorCount, collapsed, open, onClose, onToggleCollapse }: {
  openCount: number | null; donorCount: number | null; collapsed: boolean; open: boolean; onClose: () => void; onToggleCollapse: () => void;
}) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "Overview", icon: <LayoutDashboard size={17} />, badge: null as number | null, exact: true },
    { href: "/admin/requests", label: "Requests", icon: <ClipboardList size={17} />, badge: openCount, exact: false },
    { href: "/admin/donors", label: "Donors", icon: <Users size={17} />, badge: donorCount, exact: false },
    { href: "/admin/activity", label: "Activity", icon: <Activity size={17} />, badge: null, exact: false },
  ];
  return (
    <>
      <div className="ax-scrim" aria-hidden="true" onClick={onClose} />
      <aside className="ax-side" aria-label="Admin menu">
        <div className="ax-brandrow">
          <Link href="/admin" className="ax-brand" onClick={onClose}>BloodLink <span>ops</span></Link>
          <button type="button" className="ax-collapse ax-collapse--mobile" onClick={onClose} aria-label="Close menu"><X size={17} /></button>
        </div>
        <p className="ax-caption">Menu</p>
        <nav className="ax-nav">
          {items.map(item => {
            const active = item.exact ? pathname === item.href : pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} title={item.label} className={`ax-link${active ? " ax-link--active" : ""}`}>
                {item.icon}<span>{item.label}</span>
                {item.badge != null && item.badge > 0 && <b className="ax-badge">{item.badge}</b>}
              </Link>
            );
          })}
        </nav>
        <p className="ax-caption">General</p>
        <nav className="ax-nav">
          <Link href="/" className="ax-link" title="Exit admin"><LogOut size={17} /><span>Exit admin</span></Link>
        </nav>
        <div className="ax-sidecard">
          <b>Telegram channel</b>
          <p>Donor alerts go out over Telegram in waves. Keep this tab open during emergencies.</p>
        </div>
        <button type="button" className="ax-collapse ax-collapse--desktop" onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand" : "Collapse"}>
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </aside>
    </>
  );
}
