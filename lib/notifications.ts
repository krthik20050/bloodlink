import { distanceKm } from "./geo";
import { sendDonationRequest } from "./telegram";
import type { Notification } from "./domain";
import {
  createNotification,
  getRequest,
  listDonors,
  listNotifications,
  updateDonor,
  updateNotification,
} from "./supabase/repository";

export async function queueNotifications(requestId: string, donorIds: string[], waveNumber: number): Promise<Notification[]> {
  const request = await getRequest(requestId);
  if (!request) throw new Error("Request not found");
  const [donors, existing] = await Promise.all([listDonors(), listNotifications()]);
  // ponytail: snapshot dedupe so a retry/wave never double-inserts PENDING per (request,donor)
  const seen = new Set(existing.filter(n => n.requestId === requestId && n.response === "PENDING").map(n => n.donorId));
  // ponytail: allSettled per donor so one bad donor/Telegram send never fails the wave
  const settled = await Promise.allSettled(donorIds.map(async (donorId): Promise<Notification | null> => {
    const donor = donors.find(item => item.id === donorId);
    if (!donor) {
      console.warn(JSON.stringify({ event: "notification_skipped", requestId, donorId, reason: "donor-not-found" }));
      return null;
    }
    const dup = existing.find(n => n.requestId === requestId && n.donorId === donorId && n.response === "PENDING");
    if (dup || seen.has(donorId)) return dup ?? null;
    seen.add(donorId);
    // ponytail: skip-before-insert — no junk PENDING rows for donors without a verified chat id
    const chatId = donor.telegramChatId ?? "";
    if (!/^-?\d+$/.test(chatId)) {
      console.warn(JSON.stringify({ event: "notification_skipped", requestId, donorId, reason: "missing-chat-id" }));
      return null;
    }
    const actionToken = crypto.randomUUID();
    const notification = await createNotification({
      requestId,
      donorId,
      waveNumber,
      response: "PENDING",
      sentAt: new Date().toISOString(),
      actionToken,
    });
    console.info(JSON.stringify({ event: "notification_queued", requestId, donorId, waveNumber, mock: process.env.MOCK_TELEGRAM !== "false" }));
    try {
      const result = await sendDonationRequest({
        chatId,
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        distanceKm: distanceKm(donor.location, request.location),
        urgency: request.urgency,
        actionToken,
      });
      if (result === "skipped") {
        const respondedAt = new Date().toISOString();
        await updateNotification(notification.id, { response: "FAILED", respondedAt });
        console.error(JSON.stringify({ event: "notification_failed", requestId, notificationId: notification.id, error: "telegram-skipped" }));
        return { ...notification, response: "FAILED" as const, respondedAt };
      }
      await updateDonor(donor.id, { lastNotifiedAt: new Date().toISOString() });
      return notification;
    } catch (error) {
      const respondedAt = new Date().toISOString();
      await updateNotification(notification.id, { response: "FAILED", respondedAt });
      console.error(JSON.stringify({ event: "notification_failed", requestId, notificationId: notification.id, error: error instanceof Error ? error.message : "unknown" }));
      return { ...notification, response: "FAILED" as const, respondedAt };
    }
  }));
  return settled.flatMap(outcome => outcome.status === "fulfilled" && outcome.value ? [outcome.value] : []);
}
