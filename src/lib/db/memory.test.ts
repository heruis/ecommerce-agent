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

describe("MemoryRepo — compliance suite", () => {
  const owner = { id: "u_owner", email: "owner@example.com" };
  const other = { id: "u_other", email: "other@example.com" };

  it("keeps evidence and tool runs private to their owner", async () => {
    resetMemoryStore();
    const repo = new MemoryRepo();
    await repo.ensureProfile(owner);
    await repo.ensureProfile(other);
    const doc = await repo.createEvidence(owner.id, {
      name: "SGS test report",
      kind: "test_report",
      issuer: "SGS",
      reference: "SH123",
      claims: ["BPA-free"],
      expires_on: null,
      notes: "",
    });
    expect(await repo.listEvidence(other.id)).toHaveLength(0);
    expect(await repo.deleteEvidence(other.id, doc.id)).toBe(false);

    const run = await repo.createToolRun(owner.id, "appeal", {
      platform: "amazon_us",
      notice: "Your listing was removed for a pesticide claim.",
      listing_text: "",
      seller_note: "",
      evidence: "",
    });
    expect(run.status).toBe("running");
    expect(await repo.getToolRun(other.id, run.id)).toBeNull();
    await expect(
      repo.saveToolRun(other.id, run.id, { status: "failed", result: null, error: "x" }),
    ).rejects.toThrow();
    expect((await repo.listToolRuns(owner.id, "appeal"))[0]).toMatchObject({
      id: run.id,
      kind: "appeal",
      title: "Your listing was removed for a pesticide claim.",
    });
  });

  it("adds purchased credits and exports then deletes all of a user's data", async () => {
    resetMemoryStore();
    const repo = new MemoryRepo();
    const p = await repo.ensureProfile(owner);
    expect(await repo.addCredits(owner.id, 20)).toBe(p.credits_remaining);
    await repo.createEvidence(owner.id, {
      name: "Invoice",
      kind: "invoice",
      issuer: "",
      reference: "",
      claims: [],
      expires_on: null,
      notes: "",
    });
    const data = await repo.exportUserData(owner.id);
    expect(data.profile?.id).toBe(owner.id);
    expect(data.evidence).toHaveLength(1);
    await repo.deleteUserData(owner.id);
    expect(await repo.getProfile(owner.id)).toBeNull();
    expect(await repo.listEvidence(owner.id)).toHaveLength(0);
  });
});
