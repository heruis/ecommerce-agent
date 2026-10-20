import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRepo, resetMemoryStore } from "@/lib/db";
import { deleteAccount } from "./account";

const user = { id: "u_del", email: "del@example.com" };

describe("deleteAccount", () => {
  beforeEach(() => resetMemoryStore());

  it("cancels the subscription first, then deletes data and the sign-in identity", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, { plan: "pro", credits: 10, stripe_subscription_id: "sub_9" });
    const order: string[] = [];
    const result = await deleteAccount({
      user,
      repo,
      cancelSubscription: async (id) => {
        order.push(`cancel:${id}`);
      },
      deleteAuthUser: async (id) => {
        order.push(`auth:${id}`);
      },
    });
    expect(result).toEqual({ ok: true });
    expect(order).toEqual(["cancel:sub_9", `auth:${user.id}`]);
    expect(await repo.getProfile(user.id)).toBeNull();
  });

  it("deletes nothing when the subscription cannot be cancelled", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, { plan: "pro", credits: 10, stripe_subscription_id: "sub_9" });
    const deleteAuthUser = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await deleteAccount({
      user,
      repo,
      cancelSubscription: async () => {
        throw new Error("stripe down");
      },
      deleteAuthUser,
    });
    expect(result).toEqual({ ok: false, reason: "subscription" });
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(await repo.getProfile(user.id)).not.toBeNull();
  });

  it("works for a free user without billing or auth hooks (demo mode)", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    expect(await deleteAccount({ user, repo })).toEqual({ ok: true });
    expect(await repo.getProfile(user.id)).toBeNull();
  });
});
