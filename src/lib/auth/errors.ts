/**
 * Supabase Auth errors -> one of our friendly message keys (auth dictionary,
 * `errors`). Error codes first (stable); message text as a fallback for older
 * servers and network failures.
 */
export type AuthErrorKey =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "invalidCode"
  | "rateLimited"
  | "smsNotConfigured"
  | "emailNotAuthorized"
  | "weakPassword"
  | "userExists"
  | "samePassword"
  | "invalidPhone"
  | "sessionExpired"
  | "network"
  | "generic";

const BY_CODE: Record<string, AuthErrorKey> = {
  invalid_credentials: "invalidCredentials",
  email_not_confirmed: "emailNotConfirmed",
  phone_not_confirmed: "emailNotConfirmed",
  otp_expired: "invalidCode",
  otp_disabled: "invalidCode",
  over_email_send_rate_limit: "rateLimited",
  over_sms_send_rate_limit: "rateLimited",
  over_request_rate_limit: "rateLimited",
  sms_send_failed: "smsNotConfigured",
  phone_provider_disabled: "smsNotConfigured",
  email_address_not_authorized: "emailNotAuthorized",
  weak_password: "weakPassword",
  user_already_exists: "userExists",
  email_exists: "userExists",
  phone_exists: "userExists",
  same_password: "samePassword",
  session_not_found: "sessionExpired",
  session_expired: "sessionExpired",
  refresh_token_not_found: "sessionExpired",
};

export function authErrorKey(error: unknown): AuthErrorKey {
  if (!error || typeof error !== "object") return "generic";
  const e = error as { code?: unknown; message?: unknown; status?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  const message = typeof e.message === "string" ? e.message.toLowerCase() : "";

  if (BY_CODE[code]) return BY_CODE[code];
  if (code === "validation_failed" && message.includes("phone")) return "invalidPhone";

  const has = (...words: string[]) => words.every((w) => message.includes(w));
  if (has("invalid login credentials")) return "invalidCredentials";
  if (has("email not confirmed")) return "emailNotConfirmed";
  if (has("token has expired") || has("invalid", "otp")) return "invalidCode";
  if (has("rate limit") || has("too many") || e.status === 429) return "rateLimited";
  if (has("sms") || has("phone provider") || has("twilio")) return "smsNotConfigured";
  if (has("not authorized")) return "emailNotAuthorized";
  if (has("password", "weak") || has("password", "at least")) return "weakPassword";
  if (has("already registered") || has("already exists")) return "userExists";
  if (has("invalid phone")) return "invalidPhone";
  if (has("auth session missing")) return "sessionExpired";
  if (has("failed to fetch") || has("network")) return "network";
  return "generic";
}
