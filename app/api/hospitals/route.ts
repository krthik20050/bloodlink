import { NextResponse } from "next/server";
import { findNearbyHospitals } from "@/lib/hospitals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
  }
  return NextResponse.json({ hospitals: await findNearbyHospitals(latitude, longitude) });
}
