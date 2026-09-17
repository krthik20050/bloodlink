import { describe, expect, it } from "vitest";
import { normalizeTelegramDonationDate } from "@/lib/telegram-registration";

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
