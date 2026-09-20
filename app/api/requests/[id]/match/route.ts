import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasSameOrigin } from "@/lib/supabase/auth";
import { matchDonors } from "@/lib/matching";
import { queueNotifications } from "@/lib/notifications";
import { getRequest, listDonors, listNotifications } from "@/lib/supabase/repository";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const request = await getRequest(id);
  if (!request || request.requesterId !== user.id) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "OPEN") return NextResponse.json({ error: "Request is not open" }, { status: 409 });
  const result = matchDonors(request, await listDonors(), await listNotifications());
  let notifications;
  try {
    notifications = await queueNotifications(request.id, result.selected.map((item) => item.donorId), 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to notify donors";
    console.error(JSON.stringify({ event: "matching_notify_failed", requestId: id, error: message }));
    if (message === "Request not found") return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
  console.info(JSON.stringify({ event: "matching_completed", requestId: id, selected: result.selected.length }));
  // ponytail: counts + ids only — never names, distances, reasons, or excluded list
  return NextResponse.json({
    selectedCount: result.selected.length,
    excludedCount: result.excluded.length,
    selectedDonorIds: result.selected.map((item) => item.donorId),
    notifications: notifications.map(({ id: notificationId, donorId, waveNumber, response }) => ({
      id: notificationId, donorId, waveNumber, response,
    })),
  });
}
