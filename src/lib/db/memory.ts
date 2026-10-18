import type {
  CreditResult,
  Listing,
  ListingDraft,
  ListingSummary,
  PipelineResult,
  ProductInput,
  Profile,
  Repo,
  RunRecord,
  SessionUser,
} from "@/lib/contracts";
import { env } from "@/lib/env";
import { newId, nowIso } from "@/lib/utils/ids";

interface Store {
  profiles: Map<string, Profile>;
  listings: Map<string, Listing>;
  runs: Map<string, RunRecord & { user_id: string }>;
  stripeEvents: Map<string, string>;
}

// Survive Next.js hot reloads in dev by parking the store on globalThis.
const g = globalThis as unknown as { __listwiseMemoryStore?: Store };

function store(): Store {
  g.__listwiseMemoryStore ??= {
    profiles: new Map(),
    listings: new Map(),
    runs: new Map(),
    stripeEvents: new Map(),
  };
  return g.__listwiseMemoryStore;
}

/**
 * In-process reference implementation of the Repo port (DATA_MODE=memory).
 * Used for local dev without Supabase, unit tests and CI. Data is lost on
 * restart and is not shared between serverless instances, so never deploy it.
 *
 * It is also the executable spec for SupabaseRepo (WS4): same behavior,
 * including ownership filtering on every read and atomic credit use.
 */
export class MemoryRepo implements Repo {
  async ensureProfile(user: SessionUser): Promise<Profile> {
    const s = store();
    const existing = s.profiles.get(user.id);
    if (existing) return existing;
    const profile: Profile = {
      id: user.id,
      email: user.email,
      plan: "free",
      credits_remaining: env().FREE_RUNS,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
      created_at: nowIso(),
    };
    s.profiles.set(user.id, profile);
    return profile;
  }

  async getProfile(userId: string) {
    return store().profiles.get(userId) ?? null;
  }

  async getProfileByStripeCustomer(customerId: string) {
    return [...store().profiles.values()].find((p) => p.stripe_customer_id === customerId) ?? null;
  }

  // JavaScript runs this check-and-decrement without yielding, so concurrent
  // requests in one process cannot overspend. Postgres uses a single UPDATE.
  async consumeCredit(userId: string): Promise<CreditResult> {
    const p = store().profiles.get(userId);
    if (!p || p.credits_remaining <= 0) return { ok: false, remaining: p?.credits_remaining ?? 0 };
    p.credits_remaining -= 1;
    return { ok: true, remaining: p.credits_remaining };
  }

  async refundCredit(userId: string) {
    const p = store().profiles.get(userId);
    if (p) p.credits_remaining += 1;
  }

  async setPlan(userId: string, update: Parameters<Repo["setPlan"]>[1]) {
    const p = store().profiles.get(userId);
    if (!p) throw new Error(`No profile ${userId}`);
    Object.assign(p, {
      plan: update.plan,
      credits_remaining: update.credits,
      ...(update.stripe_customer_id !== undefined
        ? { stripe_customer_id: update.stripe_customer_id }
        : {}),
      ...(update.stripe_subscription_id !== undefined
        ? { stripe_subscription_id: update.stripe_subscription_id }
        : {}),
      ...(update.current_period_end !== undefined
        ? { current_period_end: update.current_period_end }
        : {}),
    });
  }

  async createListing(userId: string, input: ProductInput): Promise<Listing> {
    const listing: Listing = {
      id: newId("lst"),
      user_id: userId,
      created_at: nowIso(),
      updated_at: nowIso(),
      status: "draft",
      input,
      result: null,
      edited: null,
      last_run_id: null,
    };
    store().listings.set(listing.id, listing);
    return listing;
  }

  async getListing(userId: string, listingId: string) {
    const l = store().listings.get(listingId);
    return l && l.user_id === userId ? l : null;
  }

  async listListings(userId: string): Promise<ListingSummary[]> {
    return [...store().listings.values()]
      .filter((l) => l.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((l) => ({
        id: l.id,
        status: l.status,
        created_at: l.created_at,
        updated_at: l.updated_at,
        title: l.result?.listing.title ?? l.input.title_zh,
        score: l.result?.score.total ?? null,
      }));
  }

  async markListingRunning(userId: string, listingId: string, runId: string) {
    const l = await this.getListing(userId, listingId);
    if (!l) throw new Error("Listing not found");
    l.status = "running";
    l.last_run_id = runId;
    l.updated_at = nowIso();
  }

  async saveRun(userId: string, run: RunRecord, result: PipelineResult | null) {
    store().runs.set(run.id, { ...run, user_id: userId });
    const l = await this.getListing(userId, run.listing_id);
    if (!l) return;
    l.status = run.status === "completed" ? "completed" : "failed";
    if (result) {
      l.result = result;
      l.edited = null;
    }
    l.updated_at = nowIso();
  }

  async getRun(userId: string, runId: string) {
    const r = store().runs.get(runId);
    if (!r || r.user_id !== userId) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, ...run } = r;
    return run;
  }

  async saveEdits(userId: string, listingId: string, edited: ListingDraft) {
    const l = await this.getListing(userId, listingId);
    if (!l) throw new Error("Listing not found");
    l.edited = edited;
    l.updated_at = nowIso();
    return l;
  }

  async recordStripeEvent(eventId: string, type: string) {
    const s = store().stripeEvents;
    if (s.has(eventId)) return false;
    s.set(eventId, type);
    return true;
  }
}

/** Test helper: wipe the in-memory store. */
export function resetMemoryStore() {
  g.__listwiseMemoryStore = undefined;
}
