import type { Repo } from "@/lib/contracts";
import { plans } from "./plans";

/**
 * Credit rules shared by the Stripe webhook and the mock checkout. One
 * balance holds free, purchased and monthly credits, and Pro events never
 * lower it (pack credits don't expire):
 *
 *  - credit pack                -> balance + pack credits
 *  - Pro starts / renews monthly -> balance raised to at least the monthly
 *                                  allowance (max(balance, monthly))
 *  - Pro ends                   -> plan Free, balance kept
 *
 * Only the verified webhook (or BILLING_MODE=mock) calls these.
 */
export async function grantPack(repo: Repo, userId: string): Promise<number> {
  return repo.addCredits(userId, plans().pack.credits);
}

export async function startPro(
  repo: Repo,
  userId: string,
  currentBalance: number,
  ids: {
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    current_period_end?: string | null;
  },
): Promise<void> {
  // One write: if it fails, nothing changed and Stripe's retry is safe.
  await repo.setPlan(userId, {
    plan: "pro",
    credits: Math.max(currentBalance, plans().pro.credits),
    ...ids,
  });
}

export async function renewPro(
  repo: Repo,
  userId: string,
  currentBalance: number,
  periodEnd: string | null,
): Promise<void> {
  await repo.setPlan(userId, {
    plan: "pro",
    credits: Math.max(currentBalance, plans().pro.credits),
    current_period_end: periodEnd,
  });
}

export async function endPro(repo: Repo, userId: string, currentBalance: number): Promise<void> {
  // Keep stripe_customer_id so they can resubscribe with the same customer.
  await repo.setPlan(userId, {
    plan: "free",
    credits: currentBalance,
    stripe_subscription_id: null,
    current_period_end: null,
  });
}
