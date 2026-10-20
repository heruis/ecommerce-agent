import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/auth/supabase-server";

/**
 * Supabase PKCE redirect target: the default email templates
 * ({{ .ConfirmationURL }}) and password-reset links land here with ?code=…,
 * which is exchanged for a session cookie. Owner: WS4.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), "/dashboard", url.origin);
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // Supabase puts link errors (expired, already used) in the query string.
  const reason = url.searchParams.get("error_code") ?? "link_invalid";
  const back = next === "/reset-password" ? "/forgot-password" : "/login";
  return NextResponse.redirect(new URL(`${back}?error=${encodeURIComponent(reason)}`, url.origin));
}
