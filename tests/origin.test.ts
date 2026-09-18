import { describe, expect, it } from "vitest";
import { hasSameOrigin } from "@/lib/request-security";

const request = (origin?: string) => new Request("https://bloodlink.test/api/requests", {
  method: "POST",
  headers: {
    host: "bloodlink.test",
    ...(origin ? { origin } : {}),
  },
});

describe("authenticated state-changing request origin protection", () => {
  it("allows same-origin and non-browser requests", () => {
    expect(hasSameOrigin(request("https://bloodlink.test"))).toBe(true);
    expect(hasSameOrigin(request())).toBe(true);
  });

  it("rejects a different origin", () => {
    expect(hasSameOrigin(request("https://attacker.test"))).toBe(false);
  });
});
