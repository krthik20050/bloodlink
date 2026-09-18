import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminMetrics, listAdminDonors, listAdminNotifications, listAdminRequests } from "@/lib/supabase/admin-data";
import { getSupabaseUser } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/supabase/admin";

export default async function AdminPage() {
  const user = await getSupabaseUser().catch(() => null);
  if (!user) redirect("/auth");
  if (!(await isAdminUser(user.id))) redirect("/");

  const [metrics, requests, donors, notifications] = await Promise.all([
    getAdminMetrics(),
    listAdminRequests(),
    listAdminDonors(),
    listAdminNotifications(),
  ]);

  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" className="brand">BloodLink</Link>
        <nav className="nav-cluster" aria-label="Admin navigation">
          <Link href="/" className="nav-link">Exit admin</Link>
        </nav>
      </header>
      <section className="hero" aria-labelledby="admin-title">
        <div className="hero-copy">
          <p className="kicker">Restricted operations</p>
          <h1 id="admin-title">Admin dashboard</h1>
          <p className="lede">Operational visibility without exposing donor contact details or live location data.</p>
        </div>
      </section>

      <section className="principles" aria-label="Operational metrics">
        <div><span>Requests</span><b>{metrics.requests.total}</b><p>{metrics.requests.open} open · {metrics.requests.matched} matched</p></div>
        <div><span>Donors</span><b>{metrics.donors.total}</b><p>{metrics.donors.available} available · {metrics.donors.consented} consented</p></div>
        <div><span>Notifications</span><b>{metrics.notifications.total}</b><p>{metrics.notifications.pending} pending · {metrics.notifications.accepted} accepted</p></div>
      </section>

      <section className="panel" aria-labelledby="requests-title">
        <h2 id="requests-title">Recent requests</h2>
        <div className="admin-table">
          {requests.map(request => (
            <div className="admin-row" key={request.id}>
              <strong>{request.blood_group} · {request.urgency}</strong>
              <span>{request.hospital} · {request.status} · {request.units_required} unit(s)</span>
            </div>
          ))}
          {!requests.length && <p>No requests yet.</p>}
        </div>
      </section>

      <section className="panel" aria-labelledby="donors-title">
        <h2 id="donors-title">Donor operations</h2>
        <div className="admin-table">
          {donors.map(donor => (
            <div className="admin-row" key={donor.id}>
              <strong>{donor.name} · {donor.blood_group}</strong>
              <span>{donor.availability_status} · {donor.notification_consent ? "notifications consented" : "notifications off"}</span>
            </div>
          ))}
          {!donors.length && <p>No donors yet.</p>}
        </div>
      </section>

      <section className="panel" aria-labelledby="notifications-title">
        <h2 id="notifications-title">Notification delivery</h2>
        <div className="admin-table">
          {notifications.map(notification => (
            <div className="admin-row" key={notification.id}>
              <strong>Wave {notification.wave_number} · {notification.response}</strong>
              <span>Request {notification.request_id}</span>
            </div>
          ))}
          {!notifications.length && <p>No notifications yet.</p>}
        </div>
      </section>
    </main>
  );
}
