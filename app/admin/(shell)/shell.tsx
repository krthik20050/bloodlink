"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../nav";
import AdminTopbar from "../topbar";
import CommandPalette from "../palette";
import { Toaster, toast } from "../toast";

export default function Shell({ openCount, donorCount, attentionCount, children }: {
  openCount: number | null; donorCount: number | null; attentionCount: number | null; children: React.ReactNode;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [live, setLive] = useState(true);
  const fingerprint = useRef<string | null>(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("ax-collapsed") === "1"); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(value => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // ponytail: 30s polling, not Supabase Realtime — demo-admin has no Supabase user for RLS realtime.
    // Pauses in background tabs, backs off on failure, never interrupts an open dialog.
    let stop = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!stop) {
        if (!document.hidden) {
          try {
            const res = await fetch("/api/admin/metrics", { cache: "no-store" });
            if (!res.ok) throw new Error("metrics");
            const json = await res.json();
            const fp = JSON.stringify([json.requests, json.donors, json.notifications, json.matches]);
            const dialogOpen = Boolean(document.querySelector(".ax-drawer-overlay, .ax-palette-overlay"));
            if (fingerprint.current && fingerprint.current !== fp && !dialogOpen) {
              toast("New activity detected — view refreshed.");
              router.refresh();
            }
            fingerprint.current = fp;
            failures = 0;
            setLive(true);
          } catch {
            failures += 1;
            setLive(false);
          }
        }
        timer = setTimeout(tick, Math.min(30000 * 2 ** failures, 300000));
      }
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [router]);

  function toggleCollapse() {
    setCollapsed(current => {
      const next = !current;
      try { localStorage.setItem("ax-collapsed", next ? "1" : "0"); } catch { /* private mode */ }
      return next;
    });
  }

  return (
    <div className={`ax-app${collapsed ? " ax-collapsed" : ""}${navOpen ? " ax-nav-open" : ""}`}>
      <AdminNav openCount={openCount} donorCount={donorCount} collapsed={collapsed} open={navOpen} onClose={() => setNavOpen(false)} onToggleCollapse={toggleCollapse} />
      <div className="ax-main">
        <AdminTopbar attentionCount={attentionCount} live={live} onMenu={() => setNavOpen(true)} onPalette={() => setPaletteOpen(true)} />
        <div className="ax-content">{children}</div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster />
    </div>
  );
}
