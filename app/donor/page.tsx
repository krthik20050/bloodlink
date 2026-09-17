"use client";

import { FormEvent, useState } from "react";
import { bloodGroups } from "@/lib/domain";

export default function DonorPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [bloodGroup, setBloodGroup] = useState<(typeof bloodGroups)[number]>("O+");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [message, setMessage] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [busy, setBusy] = useState(false);

  function useLocation() {
    setMessage("Requesting your location permission…");
    if (!navigator.geolocation) {
      setMessage("Location access is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setMessage("Location added. It is used only to find nearby requests.");
      },
      () => setMessage("Location permission is required to register as a nearby donor."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location) {
      setMessage("Allow location access before saving your donor profile.");
      return;
    }
    if (!consent) {
      setMessage("Please agree to receive relevant donor notifications.");
      return;
    }
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/donors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, contact, bloodGroup,
        latitude: location.latitude,
        longitude: location.longitude,
        lastDonationDate: lastDonationDate || null,
        notificationConsent: consent,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) setMessage("Please sign in before saving a donor profile.");
    else if (!res.ok) setMessage(data.error ?? "Could not save the profile. Check each field and try again.");
    else {
      setTelegramLink(data.telegramLink);
      setMessage("Donor profile saved. Connect Telegram to receive relevant requests.");
    }
    setBusy(false);
  }

  return <main className="shell"><section className="panel">
    <p className="kicker">Donor profile</p>
    <h1>Be ready when it matters.</h1>
    <p>We use these details to find compatible nearby requests. This is not medical clearance.</p>
    <form onSubmit={submit}>
      <label className="field">Name<input name="name" value={name} onChange={event => setName(event.target.value)} required minLength={2} /></label>
      <label className="field">Email for confirmed matches<input name="contact" type="email" value={contact} onChange={event => setContact(event.target.value)} required /></label>
      <label className="field">Blood group<select name="bloodGroup" value={bloodGroup} onChange={event => setBloodGroup(event.target.value as (typeof bloodGroups)[number])}>{bloodGroups.map(group => <option key={group}>{group}</option>)}</select></label>
      <label className="field">Last donation date <span className="field-hint">(leave blank if you have never donated)</span><input name="lastDonationDate" type="date" value={lastDonationDate} onChange={event => setLastDonationDate(event.target.value)} /></label>
      <div className="field location-field"><span>Location</span><p className="field-hint">We never ask you to type coordinates. Allow location access so we can match nearby requests.</p><button type="button" className="secondary" onClick={useLocation}>{location ? "Location added" : "Allow location access"}</button></div>
      <label className="consent-field"><input name="consent" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /> <span>I agree to receive relevant blood-donation notifications.</span></label>
      <button disabled={busy}>{busy ? "Saving…" : "Save donor profile"}</button>
    </form>
    {message && <p className="notice" role="status">{message}</p>}
    {telegramLink && <p className="notice"><a href={telegramLink} target="_blank" rel="noreferrer">Connect Telegram to receive blood requests</a></p>}
  </section></main>;
}
