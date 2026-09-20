import Link from "next/link";
import { getSupabaseUser } from "@/lib/supabase/server";
import { getDonorContactForRequester, listRequestsByRequester } from "@/lib/supabase/repository";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My requests | RaktaSetu",
  description: "Track your blood requests and connect with your matched donor.",
};

export default async function RequestsPage() {
  const user = await getSupabaseUser().catch(() => null);
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot";
  const telegramLink = `https://t.me/${telegramBotUsername}`;

  if (!user) {
    return (
      <div className="rs-page-shell">
        <Navbar user={null} telegramLink={telegramLink} />
        <main className="rs-donor-page-main" id="main-content">
          <div className="rs-donor-container">
            <span className="rs-section-eyebrow">REQUEST INBOX</span>
            <h1 className="rs-donor-title">My requests</h1>
            <div className="rs-auth-required-banner">
              <div>
                <p className="rs-banner-title">Sign in required</p>
                <p className="rs-banner-desc">Sign in to view your requests and matched donor contacts.</p>
                <Link href="/auth" className="rs-banner-link">Sign in →</Link>
              </div>
            </div>
          </div>
        </main>
        <Footer telegramLink={telegramLink} />
      </div>
    );
  }

  const requests = await listRequestsByRequester(user.id).catch(() => []);
  const enriched = await Promise.all(requests.map(async (r) => {
    if (r.status !== "MATCHED" || !r.matchedDonorId) return { ...r, matchedDonor: null as { name: string; contact: string } | null };
    try {
      return { ...r, matchedDonor: await getDonorContactForRequester(r.matchedDonorId, user.id) };
    } catch {
      return { ...r, matchedDonor: null as { name: string; contact: string } | null };
    }
  }));

  return (
    <div className="rs-page-shell">
      <Navbar user={user} telegramLink={telegramLink} />
      <main className="rs-donor-page-main" id="main-content">
        <div className="rs-donor-container">
          <span className="rs-section-eyebrow">REQUEST INBOX</span>
          <h1 className="rs-donor-title">My requests</h1>
          <p className="rs-donor-body">Track each request and reach your matched donor directly once connected.</p>
          {enriched.length === 0 ? (
            <div className="rs-compare-col">
              <p className="rs-compare-item">No requests yet.</p>
              <Link href="/request" className="rs-banner-link">Create a request →</Link>
            </div>
          ) : (
            <div className="rs-inbox-list">
              {enriched.map((r) => {
                const muted = r.status === "EXPIRED" || r.status === "CANCELLED";
                return (
                  <article key={r.id} className={`rs-compare-col${muted ? " rs-inbox-muted" : ""}`}>
                    <div className="rs-inbox-toprow">
                      <span className="rs-compare-label">{r.bloodGroup} · {r.unitsRequired} unit{r.unitsRequired === 1 ? "" : "s"} · {r.urgency}</span>
                      <span className={`status-tag ${r.status.toLowerCase()}`}>{r.status}</span>
                    </div>
                    <p className="rs-compare-item">{r.hospital}</p>
                    <p className="rs-form-helper">{new Date(r.createdAt).toLocaleDateString()}</p>
                    {r.status === "MATCHED" && r.matchedDonor ? (
                      <div className="rs-inbox-donor">
                        <p className="rs-inbox-donor-name">{r.matchedDonor.name} · {r.matchedDonor.contact}</p>
                        <p className="rs-spec-desc">Shared because you matched — contact them directly to coordinate.</p>
                      </div>
                    ) : r.status === "OPEN" ? (
                      <p className="rs-spec-desc">Waiting for donor — no contact shared yet.</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer telegramLink={telegramLink} />
    </div>
  );
}
