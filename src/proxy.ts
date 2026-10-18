import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { refreshSupabaseSession } from "@/lib/auth/proxy-session";

/**
 * Next.js 16 "proxy" (formerly middleware). Keeps the Supabase session cookie
 * fresh. It is not the authorization layer: routes check the session and the
 * database enforces RLS. Owner: WS4.
 */
export async function proxy(request: NextRequest) {
  if (process.env.DATA_MODE !== "supabase") return NextResponse.next();
  return refreshSupabaseSession(request);
}

export const config = {
  // Skip static assets and the Stripe webhook (raw body, no session).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
