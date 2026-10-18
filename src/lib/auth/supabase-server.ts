import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

/**
 * Supabase client bound to the signed-in user's session cookie. Queries run
 * under Row Level Security as that user. Owner: WS4.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", "DATA_MODE=supabase"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "DATA_MODE=supabase"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet)
              cookieStore.set(name, value, options);
          } catch {
            // Called from a Server Component: cookies are read-only there.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Admin client with the secret key. Bypasses RLS: use it only on the server,
 * only for credits, plans, Stripe events and the knowledge base. Never import
 * it into a client component.
 */
export function createSupabaseAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", "DATA_MODE=supabase"),
    requireEnv("SUPABASE_SECRET_KEY", "DATA_MODE=supabase"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
