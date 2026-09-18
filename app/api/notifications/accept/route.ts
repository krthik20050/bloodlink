import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptNotification } from "@/lib/match-lifecycle";
import { getAuthenticatedUser, hasSameOrigin } from "@/lib/supabase/auth";

export async function POST(req: Request) {
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const data = z.object({ actionToken: z.string().uuid() }).safeParse(await req.json());
  if (!data.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  try {
    const { request, donor } = await acceptNotification(data.data.actionToken, user.id);
    return NextResponse.json({
      request: { id: request.id, status: request.status, contactExchange: "ENABLED" },
      donor: { name: donor.name, contact: donor.contact },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to accept" }, { status: 409 });
  }
}
