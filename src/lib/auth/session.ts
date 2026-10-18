import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/contracts";
import { env } from "@/lib/env";
import { DEMO_COOKIE, demoUserFromEmail } from "./demo";
import { createSupabaseServerClient } from "./supabase-server";

/**
 * The single place the app asks "who is this?" (data access layer pattern).
 * Returns null when signed out. Identity always comes from the session,
 * never from a request body or URL parameter.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (env().DATA_MODE === "memory") {
    const email = (await cookies()).get(DEMO_COOKIE)?.value;
    return email ? demoUserFromEmail(email) : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

/** For pages: redirect to /login when signed out. */
export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
