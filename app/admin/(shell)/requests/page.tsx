import { listAdminRequests } from "@/lib/supabase/admin-data";
import { requireAdmin } from "../../require-admin";
import { RequestsTable } from "../../tables";

export default async function AdminRequests({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const requests = await listAdminRequests();
  return (
    <div>
      <div className="ax-pagehead">
        <div><h1>Requests</h1><p>Every blood case in the system — filter by urgency, search the queue.</p></div>
      </div>
      <section className="ax-card" aria-label="Request queue">
        <RequestsTable rows={requests} initialQuery={q ?? ""} />
      </section>
    </div>
  );
}
