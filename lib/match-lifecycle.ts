import { appearsEligible } from "./eligibility";
import { isBloodCompatible } from "./compatibility";
import {
  claimNotification,
  createMatch,
  expirePendingNotifications,
  getNotificationByToken,
  getRequestAndDonor,
  updateDonor,
  updateRequest,
} from "./supabase/repository";

export async function acceptNotification(actionToken: string, ownerId?: string, telegramChatId?: string) {
  const notification = await getNotificationByToken(actionToken);
  if (!notification) throw new Error("Notification not found");
  const { request, donor } = await getRequestAndDonor(notification.requestId, notification.donorId);
  if (!request || !donor) throw new Error("Match record no longer exists");
  if (ownerId && donor.userId !== ownerId) throw new Error("Notification is not assigned to this user");
  if (telegramChatId && donor.telegramChatId !== telegramChatId) throw new Error("Notification is not assigned to this Telegram chat");
  if (notification.response !== "PENDING") throw new Error("This notification has already been handled");
  if (request.status !== "OPEN") throw new Error("This request is no longer open");
  if (!donor.notificationConsent || donor.availability !== "AVAILABLE" || !appearsEligible(donor.lastDonationDate) || !isBloodCompatible(donor.bloodGroup, request.bloodGroup)) {
    throw new Error("Donor no longer passes the system filters");
  }

  const respondedAt = new Date().toISOString();
  if (!await claimNotification(notification.id, "ACCEPTED", respondedAt)) throw new Error("This notification has already been handled");
  await updateRequest(request.id, { status: "MATCHED", matchedDonorId: donor.id });
  await updateDonor(donor.id, { activeMatchRequestId: request.id });
  await expirePendingNotifications(request.id, notification.id);
  await createMatch(request.id, donor.id);
  console.info(JSON.stringify({ event: "match_created", requestId: request.id, donorId: donor.id }));
  return {
    request: { ...request, status: "MATCHED", matchedDonorId: donor.id },
    donor: { ...donor, activeMatchRequestId: request.id },
  };
}

export async function declineNotification(actionToken: string, telegramChatId?: string) {
  const notification = await getNotificationByToken(actionToken);
  if (!notification) throw new Error("Notification not found");
  const { donor } = await getRequestAndDonor(notification.requestId, notification.donorId);
  if (!donor) throw new Error("Match record no longer exists");
  if (telegramChatId && donor.telegramChatId !== telegramChatId) throw new Error("Notification is not assigned to this Telegram chat");
  if (notification.response !== "PENDING") throw new Error("This notification has already been handled");
  if (!await claimNotification(notification.id, "DECLINED", new Date().toISOString())) throw new Error("This notification has already been handled");
  console.info(JSON.stringify({ event: "donor_declined", notificationId: notification.id }));
  return { ...notification, response: "DECLINED" as const };
}
