import type {
  CreditResult,
  EvidenceInput,
  EvidenceItem,
  Listing,
  ListingDraft,
  ListingSummary,
  PipelineResult,
  Platform,
  ProductInput,
  Profile,
  Repo,
  RunRecord,
  SessionUser,
  ToolKind,
  ToolRun,
  ToolRunOf,
  ToolRunStatus,
  ToolRunSummary,
  UserDataExport,
} from "@/lib/contracts";
import { env } from "@/lib/env";
import { newId, nowIso } from "@/lib/utils/ids";

interface Store {
  profiles: Map<string, Profile>;
  listings: Map<string, Listing>;
  runs: Map<string, RunRecord & { user_id: string }>;
  stripeEvents: Map<string, string>;
  evidence: Map<string, EvidenceItem>;
  toolRuns: Map<string, ToolRun>;
}

// Survive Next.js hot reloads in dev by parking the store on globalThis.
const g = globalThis as unknown as { __shelfpassMemoryStore?: Store };

function store(): Store {
  g.__shelfpassMemoryStore ??= {
    profiles: new Map(),
    listings: new Map(),
    runs: new Map(),
    stripeEvents: new Map(),
    evidence: new Map(),
    toolRuns: new Map(),
  };
  return g.__shelfpassMemoryStore;
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
        title: l.result?.channels[0]?.listing.title ?? l.input.title_zh,
        platforms: l.input.platforms,
        score: averageScore(l.result),
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

  async saveEdits(userId: string, listingId: string, platform: Platform, edited: ListingDraft) {
    const l = await this.getListing(userId, listingId);
    if (!l) throw new Error("Listing not found");
    l.edited = { ...(l.edited ?? {}), [platform]: edited };
    l.updated_at = nowIso();
    return l;
  }

  async recordStripeEvent(eventId: string, type: string) {
    const s = store().stripeEvents;
    if (s.has(eventId)) return false;
    s.set(eventId, type);
    return true;
  }

  async releaseStripeEvent(eventId: string) {
    store().stripeEvents.delete(eventId);
  }

  async addCredits(userId: string, amount: number) {
    const p = store().profiles.get(userId);
    if (!p) throw new Error(`No profile ${userId}`);
    p.credits_remaining += Math.max(0, Math.floor(amount));
    return p.credits_remaining;
  }

  // ---- evidence library --------------------------------------------------

  async listEvidence(userId: string) {
    return [...store().evidence.values()]
      .filter((e) => e.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createEvidence(userId: string, input: EvidenceInput) {
    const item: EvidenceItem = {
      ...input,
      id: newId("evd"),
      user_id: userId,
      created_at: nowIso(),
    };
    store().evidence.set(item.id, item);
    return item;
  }

  async deleteEvidence(userId: string, evidenceId: string) {
    const e = store().evidence.get(evidenceId);
    if (!e || e.user_id !== userId) return false;
    return store().evidence.delete(evidenceId);
  }

  // ---- audits and appeals -------------------------------------------------

  async createToolRun<K extends ToolKind>(userId: string, kind: K, input: ToolRunOf<K>["input"]) {
    const now = nowIso();
    const run = {
      id: newId(kind === "audit" ? "aud" : "apl"),
      user_id: userId,
      kind,
      status: "running",
      input,
      result: null,
      error: null,
      created_at: now,
      updated_at: now,
    } as unknown as ToolRunOf<K>;
    store().toolRuns.set(run.id, run);
    return run;
  }

  async saveToolRun<K extends ToolKind>(
    userId: string,
    runId: string,
    update: { status: ToolRunStatus; result: ToolRunOf<K>["result"]; error: string | null },
  ) {
    const run = await this.getToolRun(userId, runId);
    if (!run) throw new Error("Run not found");
    Object.assign(run, update, { updated_at: nowIso() });
  }

  async getToolRun(userId: string, runId: string) {
    const r = store().toolRuns.get(runId);
    return r && r.user_id === userId ? r : null;
  }

  async listToolRuns(userId: string, kind?: ToolKind): Promise<ToolRunSummary[]> {
    return [...store().toolRuns.values()]
      .filter((r) => r.user_id === userId && (!kind || r.kind === kind))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toolRunSummary);
  }

  // ---- account -----------------------------------------------------------

  async exportUserData(userId: string): Promise<UserDataExport> {
    const s = store();
    return {
      exported_at: nowIso(),
      profile: s.profiles.get(userId) ?? null,
      listings: [...s.listings.values()].filter((l) => l.user_id === userId),
      runs: [...s.runs.values()]
        .filter((r) => r.user_id === userId)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ spans, user_id, ...run }) => run),
      tool_runs: [...s.toolRuns.values()].filter((r) => r.user_id === userId),
      evidence: await this.listEvidence(userId),
    };
  }

  async deleteUserData(userId: string) {
    const s = store();
    for (const [id, l] of s.listings) if (l.user_id === userId) s.listings.delete(id);
    for (const [id, r] of s.runs) if (r.user_id === userId) s.runs.delete(id);
    for (const [id, r] of s.toolRuns) if (r.user_id === userId) s.toolRuns.delete(id);
    for (const [id, e] of s.evidence) if (e.user_id === userId) s.evidence.delete(id);
    s.profiles.delete(userId);
  }
}

/** Dashboard row for an audit or appeal: platform and a short title from the input. */
export function toolRunSummary(r: ToolRun): ToolRunSummary {
  const text = r.kind === "audit" ? r.input.listing_text : r.input.notice;
  const firstLine =
    text
      .split(/\n/)
      .find((l) => l.trim())
      ?.trim() ?? "";
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    platform: r.input.platform,
    title: firstLine.length > 90 ? `${firstLine.slice(0, 87)}…` : firstLine,
    created_at: r.created_at,
  };
}

/** Test helper: wipe the in-memory store. */
export function resetMemoryStore() {
  g.__shelfpassMemoryStore = undefined;
}

export function averageScore(result: PipelineResult | null): number | null {
  if (!result || result.channels.length === 0) return null;
  return Math.round(
    result.channels.reduce((s, c) => s + c.score.total, 0) / result.channels.length,
  );
}
