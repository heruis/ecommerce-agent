import type Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRepo, resetMemoryStore } from "@/lib/db";
import { plans } from "./plans";
import { applyStripeEvent } from "./webhook";

const user = { id: "u_1", email: "a@example.com" };

function event(id: string, type: string, object: Record<string, unknown>): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

const proCheckout = (id: string) =>
  event(id, "checkout.session.completed", {
    mode: "subscription",
    client_reference_id: user.id,
    customer: "cus_1",
    subscription: "sub_1",
  });

const packCheckout = (id: string, extra: Record<string, unknown> = {}) =>
  event(id, "checkout.session.completed", {
    mode: "payment",
    payment_status: "paid",
    client_reference_id: user.id,
    customer: null,
    metadata: { user_id: user.id, product: "pack", credits: "20" },
    ...extra,
  });

describe("applyStripeEvent — Pro subscription", () => {
  beforeEach(() => resetMemoryStore());

  it("upgrades the user and raises the balance to the monthly credits", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user); // 3 free credits
    expect(await applyStripeEvent(proCheckout("evt_1"), repo)).toBe("processed");
    expect(await repo.getProfile(user.id)).toMatchObject({
      plan: "pro",
      credits_remaining: plans().pro.credits,
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
    });
  });

  it("never lowers a bigger balance when Pro starts", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, { plan: "free", credits: 70 });
    await applyStripeEvent(proCheckout("evt_1b"), repo);
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(70);
  });

  it("ignores duplicate deliveries of the same event", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await applyStripeEvent(proCheckout("evt_2"), repo);
    await repo.consumeCredit(user.id);
    expect(await applyStripeEvent(proCheckout("evt_2"), repo)).toBe("duplicate");
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(plans().pro.credits - 1);
  });

  it("invoice.paid tops the balance up to the monthly credits", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, { plan: "pro", credits: 3, stripe_customer_id: "cus_1" });
    const e = event("evt_3", "invoice.paid", {
      customer: "cus_1",
      lines: { data: [{ period: { end: 1_800_000_000 } }] },
    });
    expect(await applyStripeEvent(e, repo)).toBe("processed");
    expect(await repo.getProfile(user.id)).toMatchObject({
      plan: "pro",
      credits_remaining: plans().pro.credits,
      current_period_end: new Date(1_800_000_000 * 1000).toISOString(),
    });
  });

  it("invoice.paid never lowers a balance that includes purchased credits", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    const big = plans().pro.credits + plans().pack.credits;
    await repo.setPlan(user.id, { plan: "pro", credits: big, stripe_customer_id: "cus_1" });
    const e = event("evt_3b", "invoice.paid", { customer: "cus_1", lines: { data: [] } });
    await applyStripeEvent(e, repo);
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(big);
  });

  it("customer.subscription.deleted goes back to Free and keeps the balance", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, {
      plan: "pro",
      credits: 12,
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
    });
    const e = event("evt_4", "customer.subscription.deleted", { customer: "cus_1" });
    expect(await applyStripeEvent(e, repo)).toBe("processed");
    expect(await repo.getProfile(user.id)).toMatchObject({
      plan: "free",
      credits_remaining: 12,
      stripe_customer_id: "cus_1",
      stripe_subscription_id: null,
    });
  });

  it("an event for an unknown customer is ignored, not an error", async () => {
    const repo = new MemoryRepo();
    const e = event("evt_5", "invoice.paid", { customer: "cus_unknown", lines: { data: [] } });
    expect(await applyStripeEvent(e, repo)).toBe("ignored");
  });

  it("releases the event when the handler fails, so the retry is applied once", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    const failing = Object.assign(Object.create(repo), {
      setPlan: async () => {
        throw new Error("db down");
      },
    }) as MemoryRepo;
    await expect(applyStripeEvent(proCheckout("evt_6"), failing)).rejects.toThrow("db down");
    expect(await applyStripeEvent(proCheckout("evt_6"), repo)).toBe("processed");
    expect(await repo.getProfile(user.id)).toMatchObject({
      plan: "pro",
      credits_remaining: plans().pro.credits,
    });
  });
});

describe("applyStripeEvent — credit pack", () => {
  beforeEach(() => resetMemoryStore());

  it("adds the pack credits once, even if Stripe delivers the event twice", async () => {
    const repo = new MemoryRepo();
    const before = (await repo.ensureProfile(user)).credits_remaining;
    expect(await applyStripeEvent(packCheckout("evt_p1"), repo)).toBe("processed");
    expect(await applyStripeEvent(packCheckout("evt_p1"), repo)).toBe("duplicate");
    const p = await repo.getProfile(user.id);
    expect(p).toMatchObject({ plan: "free", credits_remaining: before + plans().pack.credits });
  });

  it("ignores an unpaid session", async () => {
    const repo = new MemoryRepo();
    const before = (await repo.ensureProfile(user)).credits_remaining;
    const e = packCheckout("evt_p2", { payment_status: "unpaid" });
    expect(await applyStripeEvent(e, repo)).toBe("ignored");
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(before);
  });

  it("ignores a one-time payment that is not our credit pack", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    const e = packCheckout("evt_p3", { metadata: { product: "something-else" } });
    expect(await applyStripeEvent(e, repo)).toBe("ignored");
  });

  it("ignores a purchase for an unknown user", async () => {
    const repo = new MemoryRepo();
    const e = packCheckout("evt_p4", { client_reference_id: "u_ghost" });
    expect(await applyStripeEvent(e, repo)).toBe("ignored");
  });

  it("upgrading to Pro after buying a pack never lowers the balance", async () => {
    const repo = new MemoryRepo();
    const before = (await repo.ensureProfile(user)).credits_remaining;
    await applyStripeEvent(packCheckout("evt_p5"), repo);
    await applyStripeEvent(proCheckout("evt_p6"), repo);
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(
      Math.max(before + plans().pack.credits, plans().pro.credits),
    );
  });
});
