import { listAdminDonors, listAdminNotifications } from "@/lib/supabase/admin-data";
import { requireAdmin } from "../../require-admin";
import { DonorsExplorer } from "../../tables";

export default async function AdminDonors({ searchParams }: { searchParams: Promise<{ q?: string; sel?: string }> }) {
  await requireAdmin();
  const { q, sel } = await searchParams;
  const [donors, notifications] = await Promise.all([listAdminDonors(), listAdminNotifications()]);
  return (
    <div>
      <div className="ax-pagehead">
        <div><h1>Donors</h1><p>The network — sort, filter, export, open a row for alert history. Never contact details.</p></div>
      </div>
      <section className="ax-card" aria-label="Donor directory">
        <DonorsExplorer rows={donors} notifications={notifications} initialQuery={q ?? ""} initialSelectedId={sel ?? null} />
      </section>
    </div>
  );
}
