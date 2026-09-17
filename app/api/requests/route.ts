import { NextResponse } from "next/server";
import { z } from "zod";
import { bloodGroups } from "@/lib/domain";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { id, store } from "@/lib/store";

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
  return NextResponse.json(store.requests.filter((request) => request.requesterId === user.id));
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const request = {
    id: id("request"),
    requesterId: user.id,
    bloodGroup: data.bloodGroup,
    unitsRequired: data.unitsRequired,
    hospital: data.hospital,
    location: { latitude: data.latitude, longitude: data.longitude },
    urgency: data.urgency,
    status: "OPEN" as const,
    createdAt: new Date().toISOString(),
  };
  store.requests.push(request);
  console.info(JSON.stringify({ event: "request_created", requestId: request.id }));
  return NextResponse.json({
    request,
    bloodBanks: [{
      name: "Demo Community Blood Centre",
      distanceKm: 1.8,
      bloodGroup: data.bloodGroup,
      availability: "Reported available — confirm with the blood bank.",
      source: "Mock provider",
      lastUpdated: new Date().toISOString(),
    }],
  }, { status: 201 });
}
