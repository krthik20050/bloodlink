"use client";

import React, { useState } from "react";

export const AccountSettings: React.FC<{ initialConsent: boolean; initialPaused: boolean }> = ({
  initialConsent,
  initialPaused,
}) => {
  const [consent, setConsent] = useState(initialConsent);
  const [paused, setPaused] = useState(initialPaused);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/donors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationConsent: consent, paused }),
      });
      setMessage(res.ok ? "Settings saved." : "Could not save settings. Please try again.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rs-donor-step-content">
      <label className="rs-compare-item" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span>Notify me about relevant nearby requests (website inbox + Telegram).</span>
      </label>
      <label className="rs-compare-item" style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 12 }}>
        <input
          type="checkbox"
          checked={paused}
          onChange={(e) => setPaused(e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span>Pause donations for now (you stay registered, matching skips you).</span>
      </label>
      <div style={{ marginTop: 14 }}>
        <button type="button" className="rs-btn-primary rs-btn-sm" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
      {message && (
        <p className="rs-form-helper" role="status" style={{ marginTop: 10 }}>
          {message}
        </p>
      )}
    </div>
  );
};
