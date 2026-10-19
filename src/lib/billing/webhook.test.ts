import type Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRepo, resetMemoryStore } from "@/lib/db";
import { applyStripeEvent } from "./webhook";

const user = { id: "u_1", email: "a@example.com" };

function event(id: string, type: string, object: Record<string, unknown>): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

describe("applyStripeEvent", () => {
  beforeEach(() => resetMemoryStore());

  it("upgrades the user on checkout.session.completed", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    const e = event("evt_1", "checkout.session.completed", {
      client_reference_id: user.id,
      customer: "cus_1",
      subscription: "sub_1",
    });
    expect(await applyStripeEvent(e, repo)).toBe("processed");
    expect(await repo.getProfile(user.id)).toMatchObject({
      plan: "pro",
      credits_remaining: 50,
      stripe_customer_id: "cus_1",
    });
  });

  it("ignores duplicate deliveries of the same event", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    const e = event("evt_2", "checkout.session.completed", {
      client_reference_id: user.id,
      customer: "cus_1",
      subscription: "sub_1",
    });
    await applyStripeEvent(e, repo);
    await repo.consumeCredit(user.id);
    expect(await applyStripeEvent(e, repo)).toBe("duplicate");
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(49);
  });

  it("invoice.paid resets the monthly credits", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, { plan: "pro", credits: 2, stripe_customer_id: "cus_1" });
    const e = event("evt_3", "invoice.paid", {
      customer: "cus_1",
      lines: { data: [{ period: { end: 1_800_000_000 } }] },
    });
    expect(await applyStripeEvent(e, repo)).toBe("processed");
    expect(await repo.getProfile(user.id)).toMatchObject({
      plan: "pro",
      credits_remaining: 50,
      current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
    });
  });

  it("customer.subscription.deleted downgrades to free", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, {
      plan: "pro",
      credits: 50,
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
    });
    const e = event("evt_4", "customer.subscription.deleted", { customer: "cus_1" });
    expect(await applyStripeEvent(e, repo)).toBe("processed");
    expect(await repo.getProfile(user.id)).toMatchObject({
      plan: "free",
      credits_remaining: 0,
      stripe_customer_id: "cus_1",
      stripe_subscription_id: null,
    });
  });

  it("an event for an unknown customer is ignored, not an error", async () => {
    const repo = new MemoryRepo();
    const e = event("evt_5", "invoice.paid", { customer: "cus_unknown", lines: { data: [] } });
    expect(await applyStripeEvent(e, repo)).toBe("ignored");
  });

  it("releases the event when the handler fails, so the retry is applied", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    const failing = Object.assign(Object.create(repo), {
      setPlan: async () => {
        throw new Error("db down");
      },
    }) as MemoryRepo;
    const e = event("evt_6", "checkout.session.completed", {
      client_reference_id: user.id,
      customer: "cus_1",
      subscription: "sub_1",
    });
    await expect(applyStripeEvent(e, failing)).rejects.toThrow("db down");
    expect(await applyStripeEvent(e, repo)).toBe("processed");
  });
});
