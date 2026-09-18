import { describe, expect, it } from "vitest";
import { normalizeTelegramDonationDate } from "@/lib/telegram-registration";
import { parseTelegramHospital, parseTelegramUnits, parseTelegramUrgency } from "@/lib/telegram-request";

describe("Telegram donor registration", () => {
  it.each([
    ["28/02/2005", "2005-02-28"],
    ["20/08/2005", "2005-08-20"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeTelegramDonationDate(input)).toBe(expected);
  });

  it.each(["31/02/2005", "29/02/2005", "01/13/2005", "2005-02-28", "28/2/2005"])(
    "rejects impossible or incorrectly formatted date %s",
    input => expect(normalizeTelegramDonationDate(input)).toBeUndefined(),
  );

  it("accepts none", () => {
    expect(normalizeTelegramDonationDate("none")).toBeNull();
  });
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
