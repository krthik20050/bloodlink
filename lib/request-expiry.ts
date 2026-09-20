import { expirePendingNotifications, listRequests, updateRequest } from "@/lib/supabase/repository";
import type { BloodRequest } from "@/lib/domain";

// ponytail: OPEN requests go stale fast; EMERGENCY shortest
export function expiryHoursFor(urgency: BloodRequest["urgency"]): number {
  switch (urgency) {
    case "ROUTINE":
      return 48;
    case "URGENT":
      return 12;
    case "EMERGENCY":
      return 6;
  }
}

export function isRequestStale(
  request: Pick<BloodRequest, "status" | "urgency" | "createdAt">,
  now: Date = new Date()
): boolean {
  if (request.status !== "OPEN") return false;
  const created = new Date(request.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now.getTime() - created > expiryHoursFor(request.urgency) * 3600 * 1000;
}

export async function expireStaleRequests(now: Date = new Date()): Promise<number> {
  const requests = await listRequests();
  let count = 0;
  for (const request of requests) {
    if (!isRequestStale(request, now)) continue;
    try {
      await updateRequest(request.id, { status: "EXPIRED" });
      await expirePendingNotifications(request.id);
      count += 1;
    } catch {
      // ponytail: best-effort per row, a single failure never blocks the sweep
    }
  }
  return count;
}
