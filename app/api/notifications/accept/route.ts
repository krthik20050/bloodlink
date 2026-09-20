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
      request: { id: request.id, status: request.status, contactExchange: "ENABLED", contact: request.contact },
      donor: { name: donor.name, contact: donor.contact },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to accept";
    console.error(JSON.stringify({ event: "notification_accept_failed", error: message }));
    if (message === "Notification not found" || message === "Match record no longer exists") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.startsWith("Notification is not assigned")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "This notification has expired") {
      return NextResponse.json({ error: message }, { status: 410 });
    }
    if (
      message === "This notification has already been handled" ||
      message === "This request is no longer open" ||
      message === "Donor no longer passes the system filters" ||
      message === "Donor is already matched to another request"
    ) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
