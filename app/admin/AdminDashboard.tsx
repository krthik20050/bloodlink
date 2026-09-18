"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { AdminMetrics } from "@/lib/supabase/admin-metrics";

type RequestRow = { id: string; blood_group: string; units_required: number; hospital: string; urgency: string; status: string; created_at: string };
type DonorRow = { id: string; name: string; blood_group: string; availability_status: string; notification_consent: boolean; created_at: string };
type NotificationRow = { id: string; wave_number: number; response: string; sent_at: string; responded_at: string | null };
type AdminData = { metrics: AdminMetrics; requests: RequestRow[]; donors: DonorRow[]; notifications: NotificationRow[] };

const timestamp = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const label = (value: string) => value.toLowerCase().replace("_", " ");

export default function AdminDashboard({ initial }: { initial: AdminData }) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const responses = await Promise.all(["metrics", "requests", "donors", "notifications"].map(path => fetch(`/api/admin/${path}`, { cache: "no-store" })));
      if (responses.some(response => !response.ok)) throw new Error("The operations data could not be refreshed.");
      const [metrics, requests, donors, notifications] = await Promise.all(responses.map(response => response.json()));
      setData({ metrics, requests, donors, notifications });
      setLastUpdated(new Date());
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "The operations data could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const { metrics } = data;
  return (
    <main className="shell admin-shell">
      <header className="topbar">
        <Link href="/" className="brand">BloodLink</Link>
        <nav className="nav-cluster" aria-label="Admin navigation"><Link href="/" className="nav-link">Exit admin</Link></nav>
      </header>
      <section className="admin-heading" aria-labelledby="admin-title">
        <div>
          <p className="kicker">Restricted operations</p>
          <h1 id="admin-title">Admin dashboard</h1>
          <p className="lede compact">A live view of request flow, donor readiness, and notification delivery. Private donor contact, location, and Telegram identifiers stay out of this surface.</p>
        </div>
        <div className="admin-actions">
          <p className="last-updated" aria-live="polite">Updated {timestamp(lastUpdated.toISOString())}</p>
          <button className="secondary" type="button" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh data"}</button>
        </div>
      </section>
      {error && <div className="notice notice-error" role="alert"><strong>Refresh failed</strong><p>{error}</p><button className="secondary" type="button" onClick={refresh} disabled={refreshing}>Try again</button></div>}

      <section className="admin-metrics" aria-label="Operational metrics">
        <Metric title="Requests" value={metrics.requests.total} detail={`${metrics.requests.open} open · ${metrics.requests.matched} matched`} />
        <Metric title="Donors" value={metrics.donors.total} detail={`${metrics.donors.available} available · ${metrics.donors.consented} consented`} />
        <Metric title="Notifications" value={metrics.notifications.total} detail={`${metrics.notifications.pending} pending · ${metrics.notifications.accepted} accepted`} />
      </section>

      <div className="admin-grid">
        <AdminSection title="Request queue" description="Latest cases requiring operational attention.">
          {!data.requests.length ? <EmptyState text="No requests have been created." /> : data.requests.map(request => (
            <div className="admin-row" key={request.id}><div><strong>{request.blood_group} · {label(request.urgency)}</strong><small>{request.hospital} · {request.units_required} unit(s)</small></div><span className={`status-tag ${label(request.status)}`}>{label(request.status)}</span></div>
          ))}
        </AdminSection>
        <AdminSection title="Donor readiness" description="Availability and notification consent only.">
          {!data.donors.length ? <EmptyState text="No donor profiles have been created." /> : data.donors.map(donor => (
            <div className="admin-row" key={donor.id}><div><strong>{donor.name} · {donor.blood_group}</strong><small>Profile added {timestamp(donor.created_at)}</small></div><span className={`status-tag ${label(donor.availability_status)}`}>{donor.notification_consent ? "Ready for alerts" : "Alerts off"}</span></div>
          ))}
        </AdminSection>
        <AdminSection title="Notification lifecycle" description="Delivery outcomes, without donor identifiers.">
          {!data.notifications.length ? <EmptyState text="No notification activity yet." /> : data.notifications.map(notification => (
            <div className="admin-row" key={notification.id}><div><strong>Wave {notification.wave_number}</strong><small>Sent {timestamp(notification.sent_at)}{notification.responded_at ? ` · Responded ${timestamp(notification.responded_at)}` : ""}</small></div><span className={`status-tag ${label(notification.response)}`}>{label(notification.response)}</span></div>
          ))}
        </AdminSection>
      </div>
    </main>
  );
}

function Metric({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <div className="metric-card"><span>{title}</span><b>{value}</b><p>{detail}</p></div>;
}

function AdminSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="panel admin-panel" aria-labelledby={`${title}-title`}><div className="section-heading"><div><h2 id={`${title}-title`}>{title}</h2><p>{description}</p></div></div><div className="admin-table">{children}</div></section>;
}

function EmptyState({ text }: { text: string }) { return <p className="empty-state">{text}</p>; }
