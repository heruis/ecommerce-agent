import type { Repo, SessionUser } from "@/lib/contracts";

export type DeleteAccountResult = { ok: true } | { ok: false; reason: "subscription" | "failed" };

/**
 * Delete a user's account in a safe order:
 *  1. cancel an active subscription (so a deleted user is never charged again);
 *     if that fails, stop and delete nothing
 *  2. delete every row the user owns (repo)
 *  3. delete the sign-in identity (Supabase Auth admin) when there is one
 * Dependencies are passed in so the order can be unit-tested with MemoryRepo.
 */
export async function deleteAccount(deps: {
  user: SessionUser;
  repo: Repo;
  cancelSubscription?: (subscriptionId: string) => Promise<void>;
  deleteAuthUser?: (userId: string) => Promise<void>;
}): Promise<DeleteAccountResult> {
  const { user, repo } = deps;
  const profile = await repo.getProfile(user.id);

  if (profile?.stripe_subscription_id && deps.cancelSubscription) {
    try {
      await deps.cancelSubscription(profile.stripe_subscription_id);
    } catch (e) {
      console.error("account delete: could not cancel subscription", e);
      return { ok: false, reason: "subscription" };
    }
  }

  try {
    await repo.deleteUserData(user.id);
    if (deps.deleteAuthUser) await deps.deleteAuthUser(user.id);
  } catch (e) {
    console.error("account delete failed", e);
    return { ok: false, reason: "failed" };
  }
  return { ok: true };
}
