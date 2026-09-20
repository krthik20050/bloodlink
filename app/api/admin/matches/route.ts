import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/admin";
import { listAdminMatches } from "@/lib/supabase/admin-data";

export async function GET(request: Request) {
  if (!(await getAdminUser(request))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return NextResponse.json(await listAdminMatches());
}
