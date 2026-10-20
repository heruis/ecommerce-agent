import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";

const TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * Email-link target for templates that send a token hash, e.g.
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
 * Works even when the link is opened in a different browser than the one
 * that signed up (unlike the PKCE ?code= flow). See docs/AUTH_SETUP.md.
 * Owner: WS4.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/reset-password" : "/dashboard";
  const next = safeNext(url.searchParams.get("next"), fallback, url.origin);

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const back = type === "recovery" ? "/forgot-password" : "/login";
  return NextResponse.redirect(new URL(`${back}?error=link_invalid`, url.origin));
}
