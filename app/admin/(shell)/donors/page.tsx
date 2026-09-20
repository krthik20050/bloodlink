import { listAdminDonors } from "@/lib/supabase/admin-data";
import { requireAdmin } from "../../require-admin";
import { DonorsTable } from "../../tables";

export default async function AdminDonors({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const donors = await listAdminDonors();
  return (
    <div>
      <div className="ax-pagehead">
        <div><h1>Donors</h1><p>The network — availability and alert consent only, never contact details.</p></div>
      </div>
      <section className="ax-card" aria-label="Donor directory">
        <DonorsTable rows={donors} initialQuery={q ?? ""} />
      </section>
    </div>
  );
}
