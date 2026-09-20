import { NextResponse } from "next/server";
import { findNearbyHospitals } from "@/lib/hospitals";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    // ponytail: no Supabase dep here (Overpass only) — no assertSupabaseEnv so hospitals stay up when DB env is missing
    const { searchParams } = new URL(request.url);
    const latitude = Number(searchParams.get("latitude"));
    const longitude = Number(searchParams.get("longitude"));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
    }
    return NextResponse.json({ hospitals: await findNearbyHospitals(latitude, longitude) });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error(JSON.stringify({ event: "hospitals_get_failed", requestId, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
