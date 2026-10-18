import type { SessionUser } from "@/lib/contracts";

/**
 * Demo sign-in for DATA_MODE=memory: a cookie holding an email address.
 * Lets the whole sign-in -> run -> pay journey work locally with no Supabase.
 * Never used when DATA_MODE=supabase.
 */
export const DEMO_COOKIE = "lw_demo_user";

export function demoUserFromEmail(email: string): SessionUser {
  const normalized = email.trim().toLowerCase();
  return { id: `demo_${normalized.replace(/[^a-z0-9]/g, "_")}`, email: normalized };
}
