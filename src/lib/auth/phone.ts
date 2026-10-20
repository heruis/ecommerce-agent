/**
 * Phone numbers for SMS codes, normalized to E.164 (+<country><number>),
 * the only format Supabase Auth and Twilio accept.
 */
export const COUNTRY_CODES = [
  { code: "+1", label: "US / CA +1" },
  { code: "+86", label: "中国 +86" },
  { code: "+852", label: "香港 +852" },
  { code: "+886", label: "台灣 +886" },
  { code: "+44", label: "UK +44" },
  { code: "+81", label: "日本 +81" },
  { code: "+84", label: "Việt Nam +84" },
] as const;

export type PhoneResult = { ok: true; phone: string } | { ok: false };

/**
 * Combine a country code and a local number. Accepts spaces, dashes, dots
 * and brackets. A number that already starts with + or 00 is international
 * and the country code is ignored. A national trunk 0 is dropped (UK 07…,
 * JP 090…).
 */
export function toE164(countryCode: string, number: string): PhoneResult {
  const raw = number.trim();
  if (!raw) return { ok: false };
  if (/[^\d\s().+-]/.test(raw)) return { ok: false };
  let digits: string;
  if (raw.startsWith("+") || raw.startsWith("00")) {
    digits = raw.replace(/^00/, "").replace(/\D/g, "");
  } else {
    const cc = countryCode.replace(/\D/g, "");
    if (!cc) return { ok: false };
    digits = cc + raw.replace(/\D/g, "").replace(/^0+/, "");
  }
  // E.164: at most 15 digits; real numbers have at least ~8 with the country code.
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return { ok: false };
  return { ok: true, phone: `+${digits}` };
}

/** "+8613800138000" -> "+86138****8000" for display. */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, -8)}${phone.slice(-8, -4).replace(/\d/g, "*")}${phone.slice(-4)}`;
}
