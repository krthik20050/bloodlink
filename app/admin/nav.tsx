"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, LayoutDashboard, LogOut, Users } from "lucide-react";

export default function AdminNav({ openCount, donorCount }: { openCount: number | null; donorCount: number | null }) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "Overview", icon: <LayoutDashboard size={17} />, badge: null as number | null, exact: true },
    { href: "/admin/requests", label: "Requests", icon: <ClipboardList size={17} />, badge: openCount, exact: false },
    { href: "/admin/donors", label: "Donors", icon: <Users size={17} />, badge: donorCount, exact: false },
    { href: "/admin/activity", label: "Activity", icon: <Activity size={17} />, badge: null, exact: false },
  ];
  return (
    <aside className="ax-side" aria-label="Admin menu">
      <Link href="/admin" className="ax-brand">BloodLink <span>ops</span></Link>
      <p className="ax-caption">Menu</p>
      <nav className="ax-nav">
        {items.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== "/admin" || pathname === item.href;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`ax-link${active ? " ax-link--active" : ""}`}>
              {item.icon}<span>{item.label}</span>
              {item.badge != null && item.badge > 0 && <b className="ax-badge">{item.badge}</b>}
            </Link>
          );
        })}
      </nav>
      <p className="ax-caption">General</p>
      <nav className="ax-nav">
        <Link href="/" className="ax-link"><LogOut size={17} /><span>Exit admin</span></Link>
      </nav>
      <div className="ax-sidecard">
        <b>Telegram channel</b>
        <p>Donor alerts go out over Telegram in waves. Keep this tab open during emergencies.</p>
      </div>
    </aside>
  );
}
