import { describe, expect, it } from "vitest";
import { evaluateFitness } from "@/lib/eligibility";
import { formatDisplayDate, normalizeCalendarDate, normalizeTelegramDonationDate } from "@/lib/telegram-registration";
import { parseTelegramHospital, parseTelegramUnits, parseTelegramUrgency } from "@/lib/telegram-request";

describe("Telegram donor registration", () => {
  it.each([
    ["28/02/2005", "2005-02-28"],
    ["20/08/2005", "2005-08-20"],
    ["28-02-2005", "2005-02-28"],
    ["28 02 2005", "2005-02-28"],
    ["28.02.2005", "2005-02-28"],
    ["8/8/2005", "2005-08-08"],
    ["8 8 2005", "2005-08-08"],
    ["28/2/2005", "2005-02-28"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeTelegramDonationDate(input)).toBe(expected);
  });

  it.each(["31/02/2005", "29/02/2005", "01/13/2005", "2005-02-28", "2005/02/28", "tomorrow", ""])(
    "rejects impossible or incorrectly formatted date %s",
    input => expect(normalizeTelegramDonationDate(input)).toBeUndefined(),
  );

  it("accepts none", () => {
    expect(normalizeTelegramDonationDate("none")).toBeNull();
  });
});

describe("Telegram display dates", () => {
  it("formats ISO dates for chat", () => {
    expect(formatDisplayDate("2005-02-28")).toBe("28 February 2005");
    expect(formatDisplayDate("2026-08-13")).toBe("13 August 2026");
  });
});

describe("Telegram donor fitness gate (same rules as the web form)", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("passes a healthy donor without deferral", () => {
    expect(evaluateFitness({ ageYears: 28, weightKg: 62, hemoglobinGdl: 13.5, systolicBpMmhg: 120, diastolicBpMmhg: 80, pulseBpm: 72 }, now))
      .toEqual({ blocked: null, deferUntil: null, unverified: false });
  });

  it("blocks underage, low weight, and pregnancy answers", () => {
    expect(evaluateFitness({ ageYears: 16 }, now).blocked).toMatch(/18 and 65/);
    expect(evaluateFitness({ weightKg: 40 }, now).blocked).toMatch(/45 kg/);
    expect(evaluateFitness({ isPregnantNow: true }, now).blocked).toMatch(/pregnancy/);
  });

  it("defers alcohol use to the next day", () => {
    expect(evaluateFitness({ alcohol24h: true }, now)).toEqual(expect.objectContaining({ deferUntil: "2026-01-02" }));
  });

  it("marks skipped vitals as unverified instead of blocking", () => {
    const result = evaluateFitness({ ageYears: 30 }, now);
    expect(result.blocked).toBeNull();
    expect(result.unverified).toBe(true);
  });
});

describe("Telegram calendar dates", () => {
  it("accepts exact ISO calendar dates", () => {
    expect(normalizeCalendarDate("2005-02-28")).toBe("2005-02-28");
  });

  it.each(["28/02/2005", "2005-13-01", "2005-02-30", "not-a-date"])(
    "rejects non-ISO or impossible calendar date %s",
    input => expect(normalizeCalendarDate(input)).toBeUndefined(),
  );
});

describe("Telegram requester validation", () => {
  it.each([["1", 1], ["10", 10]])("accepts %s unit(s)", (input, expected) => {
    expect(parseTelegramUnits(input)).toBe(expected);
  });

  it.each(["0", "11", "1.5", "many"])("rejects invalid units %s", input => {
    expect(parseTelegramUnits(input)).toBeNull();
  });

  it("normalizes urgency and hospital input", () => {
    expect(parseTelegramUrgency(" emergency ")).toBe("EMERGENCY");
    expect(parseTelegramHospital(" City Hospital ")).toBe("City Hospital");
  });

  it("rejects invalid urgency and hospital input", () => {
    expect(parseTelegramUrgency("critical")).toBeNull();
    expect(parseTelegramHospital("x")).toBeNull();
  });
});
