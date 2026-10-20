/**
 * Where to send the user after signing in. Only same-origin paths are
 * allowed, so a crafted link (?next=https://evil.example) can never turn our
 * login page into an open redirect. Absolute URLs on our own origin are
 * reduced to their path; a link back to /auth/callback or /auth/confirm is
 * unwrapped to its own `next` (Supabase email templates may pass
 * {{ .RedirectTo }}, which is a full URL).
 */
export function safeNext(
  raw: string | null | undefined,
  fallback = "/dashboard",
  origin?: string,
): string {
  if (!raw) return fallback;
  let value = raw.trim();
  if (origin && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(origin).origin) return fallback;
      if (url.pathname === "/auth/callback" || url.pathname === "/auth/confirm") {
        return safeNext(url.searchParams.get("next"), fallback);
      }
      value = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallback;
    }
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // Control characters and backslashes have no place in our paths.
  if (/[\u0000-\u001f\\]/.test(value)) return fallback;
  return value;
}
