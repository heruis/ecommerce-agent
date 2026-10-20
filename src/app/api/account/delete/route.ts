import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_COOKIE, getSessionUser } from "@/lib/auth";
import { deleteAccount } from "@/lib/auth/account";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/auth/supabase-server";
import { StripeBilling } from "@/lib/billing/stripe";
import { getRepo } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, readJson, unauthorized, validationError } from "@/lib/http/responses";

const Body = z.object({ confirm: z.literal("DELETE") });

/**
 * Permanently delete the signed-in user's account: cancel an active
 * subscription, delete their rows, delete the Supabase Auth user, sign out.
 * The user always comes from the session, never from the request body.
 * Owner: WS4.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);

  const e = env();
  const result = await deleteAccount({
    user,
    repo: getRepo(),
    cancelSubscription:
      e.BILLING_MODE === "stripe" ? (id) => new StripeBilling().cancelSubscription(id) : undefined,
    deleteAuthUser:
      e.DATA_MODE === "supabase"
        ? async (id) => {
            const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(id);
            if (error) throw error;
          }
        : undefined,
  });
  if (!result.ok) {
    return result.reason === "subscription"
      ? apiError(502, "subscription_cancel_failed", "Could not cancel the subscription.")
      : apiError(500, "delete_failed", "Could not delete the account.");
  }

  if (e.DATA_MODE === "supabase") {
    // The user no longer exists; clear the local session cookies.
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
