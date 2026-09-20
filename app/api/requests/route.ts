import { NextResponse } from "next/server";
import { z } from "zod";
import { bloodGroups, isValidRequestContact } from "@/lib/domain";
import { getAuthenticatedUser, hasSameOrigin } from "@/lib/supabase/auth";
import { assertSupabaseEnv } from "@/lib/supabase/server";
import { createRequest, getDonorContactForRequester, listRequestsByRequester } from "@/lib/supabase/repository";
import { findRaktkoshAvailability } from "@/lib/raktkosh";

const schema = z.object({
  bloodGroup: z.enum(bloodGroups),
  unitsRequired: z.number().int().min(1).max(10).default(1),
  hospital: z.string().min(2).max(100),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  urgency: z.enum(["ROUTINE", "URGENT", "EMERGENCY"]),
  contact: z.string().trim().min(5).max(100).refine(isValidRequestContact, "Provide a valid email or phone number"),
});

export async function GET(req: Request) {
  const rid = req.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    assertSupabaseEnv();
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const requests = await listRequestsByRequester(user.id);
    // ponytail: best-effort per-request enrichment; a contact lookup never fails the list
    const enriched = await Promise.all(requests.map(async (r) => {
      if (r.status !== "MATCHED" || !r.matchedDonorId) return r;
      try {
        const matchedDonor = await getDonorContactForRequester(r.matchedDonorId, user.id);
        return { ...r, matchedDonor };
      } catch {
        return { ...r, matchedDonor: null };
      }
    }));
    return NextResponse.json(enriched);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error(JSON.stringify({ event: "requests_get_failed", requestId: rid, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const rid = req.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    assertSupabaseEnv();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  let request;
  try {
    request = await createRequest({
      requesterId: user.id,
      bloodGroup: data.bloodGroup,
      unitsRequired: data.unitsRequired,
      hospital: data.hospital,
      location: { latitude: data.latitude, longitude: data.longitude },
      urgency: data.urgency,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      contact: data.contact,
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "request_create_failed", requestId: rid, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Unable to create request" }, { status: 500 });
  }
  // ponytail: official stock is best-effort — request still 201s degraded rather than 500ing
  let bloodBanks: Awaited<ReturnType<typeof findRaktkoshAvailability>>["rows"] = [];
  let raktkoshDegraded = false;
  try {
    const official = await findRaktkoshAvailability(data.bloodGroup);
    bloodBanks = official.rows;
    raktkoshDegraded = official.degraded;
  } catch (error) {
    raktkoshDegraded = true;
    console.error(JSON.stringify({ event: "raktkosh_failed", requestId: rid, error: error instanceof Error ? error.message : "unknown" }));
  }
  console.info(JSON.stringify({ event: "request_created", requestId: request.id, rid, officialAvailabilityRows: bloodBanks.length, raktkoshDegraded }));
  return NextResponse.json({ request, bloodBanks, raktkoshDegraded }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error(JSON.stringify({ event: "requests_post_failed", requestId: rid, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
