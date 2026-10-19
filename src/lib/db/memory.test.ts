import { beforeEach, describe, expect, it } from "vitest";
import { ProductInput } from "@/lib/contracts";
import { MemoryRepo, resetMemoryStore } from "./memory";

const alice = { id: "u_alice", email: "alice@example.com" };
const bob = { id: "u_bob", email: "bob@example.com" };
const input = ProductInput.parse({
  title_zh: "杯子",
  description_zh: "食品级硅胶折叠水杯，容量350ml。",
});

describe("MemoryRepo (reference behavior for SupabaseRepo)", () => {
  beforeEach(() => resetMemoryStore());

  it("gives new users the free credits", async () => {
    const p = await new MemoryRepo().ensureProfile(alice);
    expect(p).toMatchObject({ plan: "free", credits_remaining: 3 });
  });

  it("never spends more credits than the user has, even concurrently", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(alice);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => repo.consumeCredit(alice.id)),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect((await repo.getProfile(alice.id))!.credits_remaining).toBe(0);
  });

  it("filters every read by owner (no IDOR)", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(alice);
    await repo.ensureProfile(bob);
    const listing = await repo.createListing(alice.id, input);
    expect(await repo.getListing(bob.id, listing.id)).toBeNull();
    expect(await repo.listListings(bob.id)).toHaveLength(0);
    await expect(
      repo.saveEdits(bob.id, listing.id, "amazon_us", {
        title: "x",
        bullets: [],
        description: "",
        search_terms: "",
        seo_title: "",
        seo_description: "",
        tags: [],
      }),
    ).rejects.toThrow();
  });

  it("records each Stripe event once", async () => {
    const repo = new MemoryRepo();
    expect(await repo.recordStripeEvent("evt_1", "checkout.session.completed")).toBe(true);
    expect(await repo.recordStripeEvent("evt_1", "checkout.session.completed")).toBe(false);
  });
});
