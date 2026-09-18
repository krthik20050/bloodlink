import { NextResponse } from "next/server";
import { z } from "zod";
import { bloodGroups } from "@/lib/domain";
import { getAuthenticatedUser, hasSameOrigin } from "@/lib/supabase/auth";
import { createRequest, listRequestsByRequester } from "@/lib/supabase/repository";
import { findRaktkoshAvailability } from "@/lib/raktkosh";

const schema = z.object({
  bloodGroup: z.enum(bloodGroups),
  unitsRequired: z.number().int().min(1).max(10).default(1),
  hospital: z.string().min(2).max(100),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  urgency: z.enum(["ROUTINE", "URGENT", "EMERGENCY"]),
});

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  return NextResponse.json(await listRequestsByRequester(user.id));
}

export async function POST(req: Request) {
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const request = await createRequest({
    requesterId: user.id,
    bloodGroup: data.bloodGroup,
    unitsRequired: data.unitsRequired,
    hospital: data.hospital,
    location: { latitude: data.latitude, longitude: data.longitude },
    urgency: data.urgency,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  });
  const bloodBanks = await findRaktkoshAvailability(data.bloodGroup);
  console.info(JSON.stringify({ event: "request_created", requestId: request.id, officialAvailabilityRows: bloodBanks.length }));
  return NextResponse.json({ request, bloodBanks }, { status: 201 });
}
