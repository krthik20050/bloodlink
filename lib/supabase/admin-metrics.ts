export type AdminMetrics = {
  requests: { total: number; open: number; matched: number; cancelled: number; expired: number };
  donors: { total: number; available: number; paused: number; consented: number };
  notifications: { total: number; pending: number; accepted: number; declined: number; expired: number; failed: number };
};

type RequestRow = { status: string };
type DonorRow = { availability_status: string; notification_consent: boolean };
type NotificationRow = { response: string };

export function summarizeAdminMetrics(
  requests: RequestRow[],
  donors: DonorRow[],
  notifications: NotificationRow[],
): AdminMetrics {
  const count = <T>(rows: T[], predicate: (row: T) => boolean) => rows.filter(predicate).length;
  return {
    requests: {
      total: requests.length,
      open: count(requests, row => row.status === "OPEN"),
      matched: count(requests, row => row.status === "MATCHED"),
      cancelled: count(requests, row => row.status === "CANCELLED"),
      expired: count(requests, row => row.status === "EXPIRED"),
    },
    donors: {
      total: donors.length,
      available: count(donors, row => row.availability_status === "AVAILABLE"),
      paused: count(donors, row => row.availability_status === "PAUSED"),
      consented: count(donors, row => row.notification_consent),
    },
    notifications: {
      total: notifications.length,
      pending: count(notifications, row => row.response === "PENDING"),
      accepted: count(notifications, row => row.response === "ACCEPTED"),
      declined: count(notifications, row => row.response === "DECLINED"),
      expired: count(notifications, row => row.response === "EXPIRED"),
      failed: count(notifications, row => row.response === "FAILED"),
    },
  };
}
