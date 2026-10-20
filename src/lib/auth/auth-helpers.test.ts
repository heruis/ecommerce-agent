import { describe, expect, it } from "vitest";
import { authErrorKey } from "./errors";
import { maskPhone, toE164 } from "./phone";
import { safeNext } from "./redirect";

describe("safeNext (no open redirects)", () => {
  it.each([
    [null, "/dashboard"],
    ["/listings/new", "/listings/new"],
    ["/pricing?buy=pack", "/pricing?buy=pack"],
    ["//evil.example/x", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["https://evil.example/dashboard", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["dashboard", "/dashboard"],
    ["/a\nb", "/dashboard"],
  ])("%s -> %s", (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });

  it("reduces same-origin absolute URLs and unwraps callback links", () => {
    const origin = "https://shelfpass.vercel.app";
    expect(safeNext("https://shelfpass.vercel.app/account?tab=phone", "/dashboard", origin)).toBe(
      "/account?tab=phone",
    );
    expect(
      safeNext(
        "https://shelfpass.vercel.app/auth/callback?next=%2Freset-password",
        "/dashboard",
        origin,
      ),
    ).toBe("/reset-password");
    expect(safeNext("https://other.app/account", "/dashboard", origin)).toBe("/dashboard");
    // Without an origin, absolute URLs are never accepted.
    expect(safeNext("https://shelfpass.vercel.app/account")).toBe("/dashboard");
  });
});

describe("toE164", () => {
  it.each([
    ["+1", "(415) 555-2671", "+14155552671"],
    ["+86", "138 0013 8000", "+8613800138000"],
    ["+44", "07700 900123", "+447700900123"],
    ["+81", "090-1234-5678", "+819012345678"],
    ["+1", "+86 138 0013 8000", "+8613800138000"],
    ["+86", "0086 13800138000", "+8613800138000"],
  ])("%s %s -> %s", (cc, number, expected) => {
    expect(toE164(cc, number)).toEqual({ ok: true, phone: expected });
  });

  it.each([
    ["+1", ""],
    ["+1", "12345"],
    ["+1", "555-CALL-NOW"],
    ["+86", "1".repeat(20)],
    ["", "4155552671"],
  ])("rejects %s %s", (cc, number) => {
    expect(toE164(cc, number)).toEqual({ ok: false });
  });

  it("masks the middle digits", () => {
    expect(maskPhone("+8613800138000")).toBe("+86138****8000");
  });
});

describe("authErrorKey", () => {
  it("maps Supabase error codes first", () => {
    expect(authErrorKey({ code: "invalid_credentials", message: "x" })).toBe("invalidCredentials");
    expect(authErrorKey({ code: "otp_expired" })).toBe("invalidCode");
    expect(authErrorKey({ code: "over_sms_send_rate_limit" })).toBe("rateLimited");
    expect(authErrorKey({ code: "sms_send_failed" })).toBe("smsNotConfigured");
    expect(authErrorKey({ code: "email_address_not_authorized" })).toBe("emailNotAuthorized");
    expect(authErrorKey({ code: "user_already_exists" })).toBe("userExists");
  });

  it("falls back to message text", () => {
    expect(authErrorKey({ message: "Email not confirmed" })).toBe("emailNotConfirmed");
    expect(authErrorKey({ message: "Token has expired or is invalid" })).toBe("invalidCode");
    expect(authErrorKey({ message: "Unsupported phone provider" })).toBe("smsNotConfigured");
    expect(authErrorKey({ message: "Failed to fetch" })).toBe("network");
    expect(authErrorKey(null)).toBe("generic");
  });
});
