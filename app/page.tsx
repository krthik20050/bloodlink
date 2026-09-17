import Link from "next/link";
import { getSupabaseUser } from "@/lib/supabase/server";

export default async function Home() {
  const user = await getSupabaseUser().catch(() => null);
  const telegramLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot"}`;
  const accountLabel = user ? (user.email ? user.email : "Account") : "Sign in";

  return (
    <main className="shell home-shell">
      <header className="topbar" aria-label="Main navigation">
        <Link href="/" className="brand" aria-label="BloodLink home">
          BloodLink
        </Link>

        <nav className="nav-cluster" aria-label="Primary navigation">
          <Link href="/request" className="nav-link">Request</Link>
          <Link href="/donor" className="nav-link">Donate</Link>
        </nav>

        <div className="nav-tools">
          <a className="telegram-cta" href={telegramLink} target="_blank" rel="noreferrer" aria-label="Open BloodLink on Telegram">
            Telegram
          </a>
          <Link
            href={user ? "/donor" : "/auth"}
            className="account-button"
            aria-label={user ? `Account settings for ${accountLabel}` : "Sign in to your BloodLink account"}
          >
            <span className="account-avatar" aria-hidden="true">{(accountLabel || "A").charAt(0).toUpperCase()}</span>
            <span className="account-text">
              {user ? <><strong>Account</strong><small>{user.email}</small></> : <><strong>Sign in</strong><small>Manage your profile</small></>}
            </span>
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">A clearer way to show up</p>
          <h1>When blood is needed, make the next step obvious.</h1>
          <p className="lede">
            BloodLink helps people request blood and helps compatible donors respond nearby, with privacy and human approval built into the flow.
          </p>

          <div className="actions">
            <Link className="primary" href="/request">I need blood</Link>
            <Link className="secondary" href="/donor">I want to donate</Link>
          </div>

          <p className="hero-note">
            {user ? "Your account is ready. Choose a path above." : "Sign in once, then your profile and requests stay connected."}
          </p>
        </div>

        <aside className="hero-aside">
          <span className="signal-dot" aria-hidden="true" />
          <p className="aside-label">The flow</p>
          <ol>
            <li>
              <b>Tell us what you need</b>
              <span>Blood group, urgency, and location.</span>
            </li>
            <li>
              <b>We filter responsibly</b>
              <span>Compatibility, distance, and donation timing.</span>
            </li>
            <li>
              <b>People choose</b>
              <span>Donors receive a focused Telegram alert.</span>
            </li>
          </ol>
        </aside>
      </section>

      <section className="principles">
        <div>
          <span>01</span>
          <b>Private by default</b>
          <p>Contact details stay protected until a match is confirmed.</p>
        </div>
        <div>
          <span>02</span>
          <b>Official availability</b>
          <p>We show government-source availability only when explicitly reported.</p>
        </div>
        <div>
          <span>03</span>
          <b>Human approval</b>
          <p>System filters support decisions. Clinical eligibility remains with professionals.</p>
        </div>
      </section>
    </main>
  );
}
