import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { store } from "@/lib/store";
import { matchDonors } from "@/lib/matching";
import { queueNotifications } from "@/lib/notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const request = store.requests.find((item) => item.id === id);
  if (!request || request.requesterId !== user.id) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "OPEN") return NextResponse.json({ error: "Request is not open" }, { status: 409 });
  const result = matchDonors(request, store.donors, store.notifications);
  const notifications = await queueNotifications(request.id, result.selected.map((item) => item.donorId), 1);
  console.info(JSON.stringify({ event: "matching_completed", requestId: id, selected: result.selected.length }));
  return NextResponse.json({
    result,
    notifications: notifications.map(({ id: notificationId, donorId, waveNumber, response }) => ({
      id: notificationId, donorId, waveNumber, response,
    })),
  });
}
