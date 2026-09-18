import { NextResponse } from "next/server";
import { z } from "zod";
import { bloodGroups } from "@/lib/domain";
import { createDonor, createTelegramLink, listDonorsByUser } from "@/lib/supabase/repository";
import { getAuthenticatedUser, hasSameOrigin } from "@/lib/supabase/auth";

const donorSchema = z.object({
  name: z.string().min(2).max(60),
  bloodGroup: z.enum(bloodGroups),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  lastDonationDate: z.string().date().nullable(),
  notificationConsent: z.boolean(),
  contact: z.string().email(),
});

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const donors = await listDonorsByUser(user.id);
  return NextResponse.json(donors.map(({ contact, ...safe }) => safe));
}

export async function POST(req: Request) {
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
  return NextResponse.json({
    donor: { ...donor, contact: undefined },
    telegramLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot"}?start=${token}`,
  }, { status: 201 });
}
