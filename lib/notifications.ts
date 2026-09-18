import { distanceKm } from "./geo";
import { sendDonationRequest } from "./telegram";
import type { Notification } from "./domain";
import {
  createNotification,
  getRequest,
  listDonors,
  updateNotification,
} from "./supabase/repository";

export async function queueNotifications(requestId: string, donorIds: string[], waveNumber: number): Promise<Notification[]> {
  const request = await getRequest(requestId);
  if (!request) throw new Error("Request not found");
  const donors = await listDonors();
  return Promise.all(donorIds.map(async donorId => {
    const donor = donors.find(item => item.id === donorId);
    if (!donor) throw new Error("Donor not found");
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
      await sendDonationRequest({
        chatId: donor.telegramChatId ?? "",
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        distanceKm: distanceKm(donor.location, request.location),
        urgency: request.urgency,
        actionToken,
      });
    } catch (error) {
      await updateNotification(notification.id, { response: "FAILED", respondedAt: new Date().toISOString() });
      console.error(JSON.stringify({ event: "notification_failed", notificationId: notification.id, error: error instanceof Error ? error.message : "unknown" }));
    }
    return notification;
  }));
}
