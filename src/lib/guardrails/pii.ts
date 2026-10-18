/**
 * PII redaction on the data path (course Module 4: "redaction is code, not a
 * rule in the prompt"). Seller text is scrubbed before any model sees it, and
 * trace logs are scrubbed before they are stored.
 */
export interface PiiFinding {
  kind: "email" | "phone" | "wechat" | "card" | "url";
  count: number;
}

const PATTERNS: { kind: PiiFinding["kind"]; re: RegExp; token: string }[] = [
  { kind: "email", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, token: "[EMAIL]" },
  // Payment card numbers (13-19 digits with optional separators)
  { kind: "card", re: /\b(?:\d[ -]?){13,19}\b/g, token: "[CARD]" },
  // Mainland China mobile numbers
  { kind: "phone", re: /(?<!\d)1[3-9]\d{9}(?!\d)/g, token: "[PHONE]" },
  // US-style phone numbers
  { kind: "phone", re: /(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, token: "[PHONE]" },
  // WeChat / QQ handles written as "微信: xxx" or "WeChat: xxx"
  {
    kind: "wechat",
    re: /(微信|wechat|vx|QQ)\s*[:：号]?\s*[A-Za-z0-9_-]{5,}/gi,
    token: "[CONTACT]",
  },
];

export function redactPII(text: string): { text: string; findings: PiiFinding[] } {
  let out = text;
  const findings: PiiFinding[] = [];
  for (const { kind, re, token } of PATTERNS) {
    const matches = out.match(re);
    if (matches && matches.length > 0) {
      findings.push({ kind, count: matches.length });
      out = out.replace(re, token);
    }
  }
  return { text: out, findings };
}

/** Redactor for trace logs. */
export function redactForLog(text: string): string {
  return redactPII(text).text;
}
