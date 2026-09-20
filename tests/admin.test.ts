import { describe, expect, it } from "vitest";
import { hasAdminAccess } from "@/lib/supabase/admin-policy";
import { summarizeAdminMetrics } from "@/lib/supabase/admin-metrics";

describe("admin authorization", () => {
  it("requires the matching active authorization record", () => {
    expect(hasAdminAccess({ id: "user-1" }, { user_id: "user-1", is_active: true })).toBe(true);
    expect(hasAdminAccess({ id: "user-1" }, { user_id: "user-1", is_active: false })).toBe(false);
    expect(hasAdminAccess({ id: "user-1" }, { user_id: "user-2", is_active: true })).toBe(false);
    expect(hasAdminAccess(null, { user_id: "user-1", is_active: true })).toBe(false);
  });
});

describe("admin metrics", () => {
  it("counts operational states without including private fields", () => {
    expect(summarizeAdminMetrics(
      [{ status: "OPEN" }, { status: "MATCHED" }, { status: "OPEN" }],
      [
        { availability_status: "AVAILABLE", notification_consent: true, telegram_connected: true },
        { availability_status: "PAUSED", notification_consent: false, telegram_connected: false },
      ],
      [{ response: "PENDING" }, { response: "ACCEPTED" }, { response: "FAILED" }],
      [{ id: "m1" }],
    )).toEqual({
      requests: { total: 3, open: 2, matched: 1, cancelled: 0, expired: 0 },
      donors: { total: 2, available: 1, paused: 1, consented: 1, connected: 1 },
      notifications: { total: 3, pending: 1, accepted: 1, declined: 0, expired: 0, failed: 1 },
      matches: { total: 1 },
    });
  });
});
