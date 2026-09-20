"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ponytail: no push infra — poll our own API while OPEN requests exist; banner + refresh on new match
export const InboxWatcher: React.FC<{ watch: boolean }> = ({ watch }) => {
  const router = useRouter();
  const [alert, setAlert] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!watch) return;
    let alive = true;
    const check = async () => {
      if (!alive || document.hidden) return;
      try {
        const res = await fetch("/api/requests", { cache: "no-store" });
        if (!res.ok) return;
        const rows = (await res.json()) as { id: string; status: string }[];
        const matched = new Set(rows.filter((r) => r.status === "MATCHED").map((r) => r.id));
        if (seen.current === null) {
          seen.current = matched;
          return;
        }
        for (const id of matched) {
          if (!seen.current.has(id)) {
            seen.current.add(id);
            if (alive) {
              setAlert(true);
              router.refresh();
            }
          }
        }
        if (!rows.some((r) => r.status === "OPEN")) {
          if (timer) clearInterval(timer);
        }
      } catch { /* offline now; next tick retries */ }
    };
    const timer = setInterval(check, 15000);
    void check();
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [watch, router]);

  if (!alert) return null;
  return (
    <div className="rs-auth-status-banner rs-auth-status-banner--success" role="alert">
      <span>A donor just accepted your request — their contact is shown below. Contact them now to coordinate.</span>
    </div>
  );
};
