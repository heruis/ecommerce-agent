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

/** What the account page shows about sign-in methods and verification. */
export interface AuthDetails {
  mode: "demo" | "supabase";
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  /** A phone number waiting for its confirmation code (phone change). */
  pendingPhone: string | null;
  hasPassword: boolean;
}

export async function getAuthDetails(): Promise<AuthDetails | null> {
  if (env().DATA_MODE === "memory") {
    const user = await getSessionUser();
    if (!user) return null;
    return {
      mode: "demo",
      email: user.email,
      emailVerified: false,
      phone: null,
      phoneVerified: false,
      pendingPhone: null,
      hasPassword: false,
    };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const u = data.user as typeof data.user & { new_phone?: string | null };
  const withPlus = (p: string | null | undefined) => (p ? (p.startsWith("+") ? p : `+${p}`) : null);
  return {
    mode: "supabase",
    email: u.email ?? null,
    emailVerified: Boolean(u.email_confirmed_at),
    phone: withPlus(u.phone),
    phoneVerified: Boolean(u.phone && u.phone_confirmed_at),
    pendingPhone: withPlus(u.new_phone),
    hasPassword: (u.identities ?? []).some((i) => i.provider === "email") || Boolean(u.email),
  };
}
