"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, RefreshCw, Search } from "lucide-react";

export default function AdminTopbar({ attentionCount }: { attentionCount: number | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [spinning, setSpinning] = useState(false);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const base = pathname.startsWith("/admin/donors") ? "/admin/donors" : "/admin/requests";
    router.push(query ? `${base}?q=${encodeURIComponent(query)}` : base);
  }

  function refresh() {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <header className="ax-top">
      <form className="ax-search" onSubmit={search} role="search">
        <Search size={16} aria-hidden="true" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search requests or donors…" aria-label="Search admin records" />
        <kbd>↵</kbd>
      </form>
      <div className="ax-topright">
        <button className="ax-iconbtn" type="button" onClick={refresh} aria-label="Refresh data" title="Refresh data">
          <RefreshCw size={17} className={spinning ? "spin" : ""} />
        </button>
        <Link className="ax-iconbtn" href="/admin/requests" aria-label={`${attentionCount ?? 0} items need attention`} title="Needs attention">
          <Bell size={17} />
          {(attentionCount ?? 0) > 0 && <b className="ax-dot">{attentionCount}</b>}
        </Link>
        <span className="ax-admin"><i>DA</i><span>Demo Admin<small>prototype access</small></span></span>
      </div>
    </header>
  );
}
