"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { bloodGroups } from "@/lib/domain";

type Outcome = {
  request: { id: string };
  bloodBanks: { name: string; availability: string; distanceKm: number; source: string }[];
};
type NearbyHospital = { id: string; name: string; distanceKm: number; latitude: number; longitude: number };

type LocationStatus = "idle" | "loading" | "success" | "denied" | "retry";

export default function RequestPage() {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [match, setMatch] = useState("");
  const [bloodGroup, setBloodGroup] = useState<(typeof bloodGroups)[number]>("O+");
  const [unitsRequired, setUnitsRequired] = useState(1);
  const [hospital, setHospital] = useState("Amala Hospital");
  const [urgency, setUrgency] = useState("URGENT");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [status, setStatus] = useState("Allow location access so we can match your request to nearby donors and blood banks.");
  const [busy, setBusy] = useState(false);
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [hospitalsStatus, setHospitalsStatus] = useState<"idle" | "loading" | "ready">("idle");

  function requestLocation(nextStatus: LocationStatus = "loading") {
    if (!navigator.geolocation) {
      setLocation(null);
      setLocationStatus("denied");
      setStatus("Location access is not available in this browser. Please use a modern browser to continue.");
      return;
    }

    setLocationStatus(nextStatus);
    setStatus(nextStatus === "retry" ? "Retrying location access…" : "Requesting your browser location…");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const nextLocation = { latitude: coords.latitude, longitude: coords.longitude };
        setLocation(nextLocation);
        setLocationStatus("success");
        setStatus("Location enabled. We’ll use this to find nearby help without asking you to type coordinates.");
        setHospitalsStatus("loading");
        try {
          const response = await fetch(`/api/hospitals?latitude=${nextLocation.latitude}&longitude=${nextLocation.longitude}`);
          const data = await response.json();
          const nearby = Array.isArray(data.hospitals) ? data.hospitals as NearbyHospital[] : [];
          setHospitals(nearby);
          if (nearby.length > 0) setHospital(nearby[0].name);
          else setHospital("");
        } catch {
          setHospitals([]);
        } finally {
          setHospitalsStatus("ready");
        }
      },
      (error) => {
        setLocation(null);
        const denied = error.code === 1;
        setLocationStatus(denied ? "denied" : "retry");
        setStatus(
          denied
            ? "Location permission was denied. Please allow access to continue or retry when you’re ready."
            : "We couldn’t read your location right now. Please try again to continue.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMatch("");

    if (!location) {
      setLocationStatus("denied");
      setStatus("Allow location access before creating the request.");
      return;
    }

    setBusy(true);
    setStatus("Creating your request…");

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bloodGroup,
        unitsRequired,
        hospital,
        latitude: location.latitude,
        longitude: location.longitude,
        urgency,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      setStatus("Please sign in before creating a blood request.");
    } else if (!res.ok) {
      setStatus(data.error ?? "Could not create the request. Check the details and try again.");
    } else {
      const nextOutcome = data as Outcome;
      setOutcome(nextOutcome);
      setStatus(nextOutcome.bloodBanks.length > 0
        ? "Your request is live. Official availability was reported."
        : "No blood-bank stock was confirmed. We’re moving straight to compatible donor matching.");
      if (nextOutcome.bloodBanks.length === 0) {
        await runMatchFor(nextOutcome.request.id);
      }
    }

    setBusy(false);
  }

  async function runMatchFor(requestId: string) {
    const res = await fetch(`/api/requests/${requestId}/match`, { method: "POST" });
    const data = await res.json();
    setMatch(res.ok ? `${data.result.selected.length} donor(s) received the first notification wave. ${data.result.excluded.length} were safely excluded.` : data.error);
  }

  async function runMatch() {
    if (outcome) await runMatchFor(outcome.request.id);
  }

  return (
    <main className="shell request-shell">
      <header className="topbar" aria-label="Request navigation">
        <Link href="/" className="brand" aria-label="BloodLink home">BloodLink</Link>
        <nav className="nav-cluster" aria-label="Quick links">
          <Link href="/request" className="nav-link">Request</Link>
          <Link href="/donor" className="nav-link">Donate</Link>
        </nav>
        <a className="telegram-cta" href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot"}`} target="_blank" rel="noreferrer">
          Telegram
        </a>
      </header>

      <section className="panel request-panel">
        <div className="request-header">
          <p className="kicker">Request blood</p>
          <h1>We’ll find someone.</h1>
        </div>

        <p className="lede compact">
          Share what you need and let the browser confirm your location so we can match you with nearby donors and approved availability.
        </p>

        <form onSubmit={submit} className="request-form">
          <div className="field-grid">
            <label className="field">
              <span>Blood group needed</span>
              <select value={bloodGroup} onChange={(event) => setBloodGroup(event.target.value as (typeof bloodGroups)[number])}>
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Units required</span>
              <input
                type="number"
                min={1}
                max={10}
                value={unitsRequired}
                onChange={(event) => setUnitsRequired(Number(event.target.value) || 1)}
                required
              />
            </label>

            <label className="field full-width">
              <span>Hospital</span>
              <select value={hospital} onChange={(event) => setHospital(event.target.value)} required disabled={hospitalsStatus === "loading"}>
                {hospitalsStatus === "loading" && <option>Finding nearby hospitals…</option>}
                {hospitals.length === 0 && hospitalsStatus === "ready" && <option value="">No nearby hospital found</option>}
                {hospitals.length > 0 && hospitals.map((item) => <option key={item.id} value={item.name}>{item.name} · {item.distanceKm.toFixed(1)} km</option>)}
              </select>
              {hospitalsStatus === "ready" && hospitals.length === 0 && <span className="field-hint">No public hospital names were returned nearby. Please try again or contact the local blood bank.</span>}
            </label>

            <label className="field">
              <span>Urgency</span>
              <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
                <option value="ROUTINE">Routine</option>
                <option value="URGENT">Urgent</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </label>
          </div>

          <div className={`location-panel location-${locationStatus}`} aria-live="polite">
            <div className="location-copy-wrap">
              <p className="aside-label">Location</p>
              <p className="location-copy">
                {location
                  ? `Location confirmed: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : "We never ask you to type coordinates. Browser location lets us match the request to the nearest help."}
              </p>
            </div>

            <div className="location-actions">
              {locationStatus === "success" ? (
                <span className="status-pill success">Location ready</span>
              ) : (
                <button type="button" className="secondary" onClick={() => requestLocation(locationStatus === "denied" ? "retry" : "loading")} disabled={busy || locationStatus === "loading"}>
                  {locationStatus === "loading" ? "Locating…" : locationStatus === "denied" ? "Retry access" : "Use my location"}
                </button>
              )}
              {locationStatus === "denied" && (
                <button type="button" className="text-button" onClick={() => requestLocation("retry")}>
                  Allow browser access
                </button>
              )}
            </div>
          </div>

          <p className={`status-line status-${locationStatus}`} role="status" aria-live="polite">
            {status}
          </p>

          <button type="submit" className="primary request-submit" disabled={busy || locationStatus === "loading"}>
            {busy ? "Creating request…" : "Create request"}
          </button>
        </form>

        {outcome && (
          <div className="notice" aria-live="polite">
            {outcome.bloodBanks.length > 0 ? (
              <>
                <strong>Official availability reported.</strong>
                <p>
                  {outcome.bloodBanks[0].name} · {outcome.bloodBanks[0].distanceKm} km · {outcome.bloodBanks[0].availability}
                </p>
              </>
            ) : (
              <p>No official availability was confirmed. You can still start donor matching.</p>
            )}
            <button type="button" className="secondary" onClick={runMatch}>
              Start donor matching
            </button>
          </div>
        )}

        {match && <p className="notice" role="status">{match}</p>}
      </section>
    </main>
  );
}
