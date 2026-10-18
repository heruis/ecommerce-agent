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

  it.todo("invoice.paid resets the monthly credits (WS4)");
  it.todo("customer.subscription.deleted downgrades to free (WS4)");
  it.todo("an event for an unknown customer is ignored, not an error (WS4)");
});
