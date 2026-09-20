import { listAdminMatches, listAdminNotifications, listAdminRequests } from "@/lib/supabase/admin-data";
import { requireAdmin } from "../../require-admin";
import { RequestsExplorer } from "../../tables";

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ q?: string; sel?: string }> }) {
  await requireAdmin();
  const { q, sel } = await searchParams;
  const [requests, notifications, matches] = await Promise.all([
    listAdminRequests(), listAdminNotifications(), listAdminMatches(),
  ]);
  return (
    <div>
      <div className="ax-pagehead">
        <div><h1>Requests</h1><p>Every blood case in the system — sort, filter, export, open a row for its wave history.</p></div>
      </div>
      <section className="ax-card" aria-label="Request queue">
        <RequestsExplorer rows={requests} notifications={notifications} matches={matches} initialQuery={q ?? ""} initialSelectedId={sel ?? null} />
      </section>
    </div>
  );
}
