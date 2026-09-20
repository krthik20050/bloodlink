import Link from "next/link";
import { getSupabaseUser } from "@/lib/supabase/server";
import { listDonationsByDonor, listDonorsByUser, listRequestsByRequester } from "@/lib/supabase/repository";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AccountSettings } from "@/components/account/AccountSettings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account | RaktaSetu",
  description: "Your donor profile, requests, donations, and notification settings.",
};

export default async function AccountPage() {
  const user = await getSupabaseUser().catch(() => null);
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot";
  const telegramLink = `https://t.me/${telegramBotUsername}`;

  if (!user) {
    return (
      <div className="rs-page-shell">
        <Navbar user={null} telegramLink={telegramLink} />
        <main className="rs-donor-page-main" id="main-content">
          <div className="rs-donor-container">
            <span className="rs-section-eyebrow">ACCOUNT</span>
            <h1 className="rs-donor-title">My account</h1>
            <div className="rs-auth-required-banner">
              <div>
                <p className="rs-banner-title">Sign in required</p>
                <p className="rs-banner-desc">Sign in to view your profile, requests, and settings.</p>
                <Link href="/auth" className="rs-banner-link">Sign in →</Link>
              </div>
            </div>
          </div>
        </main>
        <Footer telegramLink={telegramLink} />
      </div>
    );
  }

  const donors = await listDonorsByUser(user.id).catch(() => []);
  const donor = donors[0] ?? null;
  const requests = await listRequestsByRequester(user.id).catch(() => []);
  const donations = donor ? await listDonationsByDonor(donor.id).catch(() => []) : [];
  const unitsGiven = donations.reduce((sum, d) => sum + d.units, 0);
  const openCount = requests.filter((r) => r.status === "OPEN").length;
  const matchedCount = requests.filter((r) => r.status === "MATCHED").length;
  const settledCount = requests.length - openCount - matchedCount;
  const profileSlots = donor
    ? [donor.name, donor.contact, donor.bloodGroup, donor.ageYears, donor.sex, donor.weightKg, donor.hemoglobinGdl, donor.systolicBpMmhg, donor.pulseBpm, donor.illnessAntibiotics14d, donor.tattooPiercing12m, donor.alcohol24h]
    : [];
  const profileFilled = profileSlots.filter((v) => v !== null && v !== undefined && v !== "").length;
  const profilePct = donor ? Math.round((profileFilled / profileSlots.length) * 100) : 0;
  const ringC = 2 * Math.PI * 26;

  return (
    <div className="rs-page-shell">
      <Navbar user={user} telegramLink={telegramLink} />
      <main className="rs-donor-page-main" id="main-content">
        <div className="rs-donor-container">
          <span className="rs-section-eyebrow">ACCOUNT</span>
          <h1 className="rs-donor-title">My account</h1>
          <p className="rs-donor-body">Signed in as {user.email ?? "your account"}. You receive notifications here on the website and on Telegram.</p>

          <div className="rs-stat-grid" aria-label="Account overview">
            <div className="rs-stat-tile">
              <span className="rs-stat-num rs-stat-num--accent">{donations.length}</span>
              <span className="rs-stat-cap">Donations</span>
            </div>
            <div className="rs-stat-tile">
              <span className="rs-stat-num">{unitsGiven}</span>
              <span className="rs-stat-cap">Units given</span>
            </div>
            <div className="rs-stat-tile">
              <span className="rs-stat-num">{requests.length}</span>
              <span className="rs-stat-cap">Requests</span>
            </div>
            <div className="rs-stat-tile">
              <svg className="rs-ring" width="72" height="72" viewBox="0 0 72 72" role="img" aria-label={`Profile ${profilePct}% complete`}>
                <circle cx="36" cy="36" r="26" fill="none" stroke="var(--rs-border)" strokeWidth="8" />
                <circle
                  cx="36" cy="36" r="26" fill="none"
                  stroke="var(--rs-accent, #8F2638)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={ringC} strokeDashoffset={ringC * (1 - profilePct / 100)}
                  transform="rotate(-90 36 36)"
                />
                <text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--rs-ink)">{profilePct}%</text>
              </svg>
              <span className="rs-stat-cap">Profile complete</span>
            </div>
          </div>

          {requests.length > 0 && (
            <div aria-label="Request status breakdown">
              <div className="rs-segbar">
                {openCount > 0 && <span style={{ width: `${(openCount / requests.length) * 100}%`, background: "var(--rs-accent, #8F2638)" }} />}
                {matchedCount > 0 && <span style={{ width: `${(matchedCount / requests.length) * 100}%`, background: "#2F7D4F" }} />}
                {settledCount > 0 && <span style={{ width: `${(settledCount / requests.length) * 100}%`, background: "var(--rs-secondary)" }} />}
              </div>
              <p className="rs-form-helper" style={{ marginTop: 6 }}>
                {openCount} open · {matchedCount} matched · {settledCount} settled
              </p>
            </div>
          )}

          <div className="rs-inbox-list">
            <section className="rs-compare-col" aria-label="Account details">
              <span className="rs-compare-label">ACCOUNT DETAILS</span>
              <p className="rs-compare-item">Email: {user.email ?? "—"}</p>
              <p className="rs-form-helper">User ID: {user.id.slice(0, 8)}…</p>
            </section>

            <section className="rs-compare-col" aria-label="My requests">
              <span className="rs-compare-label">MY REQUESTS</span>
              <p className="rs-compare-item">{requests.length} total · {openCount} open · {matchedCount} matched</p>
              <Link href="/requests" className="rs-banner-link">Open request inbox →</Link>
            </section>

            <section className="rs-compare-col" aria-label="Blood given">
              <span className="rs-compare-label">BLOOD GIVEN</span>
              {donor ? (
                <>
                  <p className="rs-compare-item">{donations.length} donations · {unitsGiven} unit{unitsGiven === 1 ? "" : "s"}</p>
                  {donations.slice(0, 5).map((d) => (
                    <p key={d.requestId} className="rs-form-helper">
                      {new Date(d.date).toLocaleDateString()} · {d.bloodGroup} · {d.units} unit{d.units === 1 ? "" : "s"} · {d.hospital}
                    </p>
                  ))}
                  {donor.lastDonationDate && (
                    <p className="rs-form-helper">Last recorded donation: {donor.lastDonationDate}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="rs-compare-item">No donor profile yet.</p>
                  <Link href="/donor" className="rs-banner-link">Register as a donor →</Link>
                </>
              )}
            </section>

            <section className="rs-compare-col" aria-label="Profile details">
              <span className="rs-compare-label">PROFILE DETAILS</span>
              {donor ? (
                <>
                  <p className="rs-compare-item">{donor.name} · {donor.bloodGroup}</p>
                  <p className="rs-compare-item">{donor.contact}</p>
                  <p className="rs-form-helper">
                    Fitness: {donor.fitnessUnverified ? "unverified vitals — bank will screen" : "verified answers"}
                    {donor.fitnessDeferUntil ? ` · deferred until ${donor.fitnessDeferUntil}` : ""}
                    {donor.availability !== "AVAILABLE" ? " · donations paused" : ""}
                  </p>
                  <Link href="/donor" className="rs-banner-link">Update donor profile →</Link>
                </>
              ) : (
                <p className="rs-compare-item">No details filled in yet.</p>
              )}
            </section>

            <section className="rs-compare-col" aria-label="Notifications">
              <span className="rs-compare-label">NOTIFICATIONS</span>
              <p className="rs-compare-item">Website inbox{donor?.telegramChatId ? " + Telegram ✓ connected" : ""}</p>
              <p className="rs-form-helper">
                Matches alert you here automatically. {donor?.telegramChatId
                  ? "Your Telegram is linked, so alerts reach you there too."
                  : "Link Telegram to also get donor alerts as instant messages."}
              </p>
              {!donor?.telegramChatId && (
                <a href={telegramLink} target="_blank" rel="noreferrer" className="rs-banner-link">Connect Telegram →</a>
              )}
            </section>

            <section className="rs-compare-col" aria-label="Settings">
              <span className="rs-compare-label">SETTINGS</span>
              {donor ? (
                <AccountSettings initialConsent={donor.notificationConsent} initialPaused={donor.availability !== "AVAILABLE"} />
              ) : (
                <p className="rs-compare-item">Settings appear once you register as a donor.</p>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer telegramLink={telegramLink} />
    </div>
  );
}
