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

  return (
    <div className="rs-page-shell">
      <Navbar user={user} telegramLink={telegramLink} />
      <main className="rs-donor-page-main" id="main-content">
        <div className="rs-donor-container">
          <span className="rs-section-eyebrow">ACCOUNT</span>
          <h1 className="rs-donor-title">My account</h1>
          <p className="rs-donor-body">Signed in as {user.email ?? "your account"}. You receive notifications here on the website and on Telegram.</p>

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
