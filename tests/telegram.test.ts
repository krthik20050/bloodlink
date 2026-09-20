import { describe, expect, it } from "vitest";
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
