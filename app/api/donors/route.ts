import { NextResponse } from "next/server";
import { z } from "zod";
import { bloodGroups } from "@/lib/domain";
import { createDonor, createTelegramLink, listDonorsByUser } from "@/lib/supabase/repository";
import { getAuthenticatedUser, hasSameOrigin } from "@/lib/supabase/auth";
import { assertSupabaseEnv } from "@/lib/supabase/server";

const donorSchema = z.object({
  name: z.string().min(2).max(60),
  bloodGroup: z.enum(bloodGroups),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  lastDonationDate: z.string().date().nullable(),
  notificationConsent: z.boolean(),
  contact: z.string().email(),
  sex: z.string().nullable().optional(),
  ageYears: z.number().int().nullable().optional(),
  weightKg: z.number().nullable().optional(),
  hemoglobinGdl: z.number().nullable().optional(),
  systolicBpMmhg: z.number().int().nullable().optional(),
  diastolicBpMmhg: z.number().int().nullable().optional(),
  pulseBpm: z.number().int().nullable().optional(),
  isPregnantNow: z.boolean().nullable().optional(),
  lastPregnancyEndDate: z.string().date().nullable().optional(),
  isBreastfeedingNow: z.boolean().nullable().optional(),
  illnessAntibiotics14d: z.boolean().nullable().optional(),
  tattooPiercing12m: z.boolean().nullable().optional(),
  alcohol24h: z.boolean().nullable().optional(),
  fitnessDeferUntil: z.string().date().nullable().optional(),
  fitnessUnverified: z.boolean().optional(),
});

export async function GET(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    assertSupabaseEnv();
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const donors = await listDonorsByUser(user.id);
    return NextResponse.json(donors.map(({ contact, ...safe }) => safe));
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error(JSON.stringify({ event: "donors_get_failed", requestId, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    assertSupabaseEnv();
    if (!hasSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const parsed = donorSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid donor profile", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const donor = await createDonor({
      ...data,
      userId: user.id,
      location: { latitude: data.latitude, longitude: data.longitude },
      availability: "AVAILABLE",
      telegramChatId: null,
    });
    const token = await createTelegramLink(donor.id);
    console.info(JSON.stringify({ event: "donor_created", requestId, donorId: donor.id }));
    return NextResponse.json({
      donor: { ...donor, contact: undefined },
      telegramLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot"}?start=${token}`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error(JSON.stringify({ event: "donors_post_failed", requestId, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
