import { appearsEligible } from "./eligibility";
import { isBloodCompatible } from "./compatibility";
import { sendTelegramMessage } from "./telegram";
import {
  claimDonor,
  claimNotification,
  claimRequest,
  createMatch,
  expirePendingNotifications,
  getNotificationByToken,
  getRequestAndDonor,
  releaseRequestClaim,
  updateDonor,
  updateNotification,
} from "./supabase/repository";

export async function acceptNotification(actionToken: string, ownerId?: string, telegramChatId?: string) {
  const notification = await getNotificationByToken(actionToken);
  if (!notification) throw new Error("Notification not found");
  const { request, donor } = await getRequestAndDonor(notification.requestId, notification.donorId);
  if (!request || !donor) throw new Error("Match record no longer exists");
  if (ownerId && donor.userId !== ownerId) throw new Error("Notification is not assigned to this user");
  if (telegramChatId && donor.telegramChatId !== telegramChatId) throw new Error("Notification is not assigned to this Telegram chat");
  // ponytail: 72h token TTL fail-closed; unparseable expiry = expired; NULL (pre-0008/test) = skip
  const expiresAt = (notification as unknown as { expiresAt?: string | null }).expiresAt;
  if (expiresAt) {
    const t = new Date(expiresAt).getTime();
    if (Number.isNaN(t) || t <= Date.now()) {
      await updateNotification(notification.id, { response: "EXPIRED", respondedAt: new Date().toISOString() });
      throw new Error("This notification has expired");
    }
  }
  if (notification.response !== "PENDING") throw new Error("This notification has already been handled");
  if (request.status !== "OPEN") throw new Error("This request is no longer open");
  // ponytail: compatibility.ts throws on unknown group, eligibility.ts is fail-open on "" — fail closed here since neither file is owned
  let filtersPass = false;
  try {
    const dateOk = donor.lastDonationDate === null || !Number.isNaN(new Date(`${donor.lastDonationDate}T00:00:00Z`).getTime());
    filtersPass = Boolean(donor.notificationConsent) && donor.availability === "AVAILABLE" && dateOk && appearsEligible(donor.lastDonationDate) && isBloodCompatible(donor.bloodGroup, request.bloodGroup);
  } catch { filtersPass = false; }
  if (!filtersPass) {
    throw new Error("Donor no longer passes the system filters");
  }

  const respondedAt = new Date().toISOString();
  // ponytail: order is claimRequest -> claimNotification -> donor lock -> expire -> createMatch.
  // A crash between claims and createMatch orphans MATCHED-without-match; any sweeper must reconcile
  // toward createMatch, never toward reopen, since the request/notification claims are already spent.
  if (!await claimRequest(request.id, donor.id)) throw new Error("This request is no longer open");
  if (!await claimNotification(notification.id, "ACCEPTED", respondedAt)) {
    await releaseRequestClaim(request.id, donor.id);
    throw new Error("This notification has already been handled");
  }
  if (!await claimDonor(donor.id, request.id)) {
    await releaseRequestClaim(request.id, donor.id);
    // ponytail: 409 Conflict — donor locked by a concurrent request; accept route maps message->status (outside ownership)
    throw new Error("Donor is already matched to another request");
  }
  await expirePendingNotifications(request.id, notification.id);
  await createMatch(request.id, donor.id);
  console.info(JSON.stringify({ event: "match_created", requestId: request.id, donorId: donor.id }));
  // ponytail: requester DM is best-effort; a failed send must never fail the match
  try {
    if (request.requesterId.startsWith("telegram:")) {
      const chatId = request.requesterId.slice("telegram:".length);
      if (chatId) await sendTelegramMessage(chatId, `Match found for request #${request.id.slice(0, 8)} (${request.bloodGroup}, ${request.unitsRequired} unit${request.unitsRequired === 1 ? "" : "s"}).\nDonor: ${donor.name}\nContact: ${donor.contact}\nContact is shared only because you matched.`);
    }
  } catch { /* requester notify failed; match stands */ }
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
