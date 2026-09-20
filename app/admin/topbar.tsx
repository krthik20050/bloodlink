"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Menu, RefreshCw, Search } from "lucide-react";
import { toast } from "./toast";

export default function AdminTopbar({ attentionCount, live, onMenu, onPalette }: {
  attentionCount: number | null; live: boolean; onMenu: () => void; onPalette: () => void;
}) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  function refresh() {
    setSpinning(true);
    router.refresh();
    toast("Dashboard refreshed.");
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <header className="ax-top">
      <button type="button" className="ax-iconbtn ax-menu" onClick={onMenu} aria-label="Open menu"><Menu size={17} /></button>
      <button type="button" className="ax-search ax-search--btn" onClick={onPalette} aria-label="Open command palette">
        <Search size={16} aria-hidden="true" />
        <span>Search views and records…</span>
        <kbd>⌘K</kbd>
      </button>
      <div className="ax-topright">
        <span className={`ax-live${live ? " ax-live--on" : ""}`} title={live ? "Auto-refresh connected" : "Auto-refresh unavailable"}>
          <i />{live ? "Live" : "Stale"}
        </span>
        <button className="ax-iconbtn" type="button" onClick={refresh} aria-label="Refresh data" title="Refresh data">
          <RefreshCw size={17} className={spinning ? "spin" : ""} />
        </button>
        <Link className="ax-iconbtn" href="/admin/requests" aria-label={`${attentionCount ?? 0} open requests`} title="Open requests">
          <Bell size={17} />
          {(attentionCount ?? 0) > 0 && <b className="ax-dot">{attentionCount}</b>}
        </Link>
        <span className="ax-admin"><i>DA</i><span>Demo Admin<small>prototype access</small></span></span>
      </div>
    </header>
  );
}
