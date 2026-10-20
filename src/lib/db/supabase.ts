import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import { createSupabaseAdminClient } from "@/lib/auth/supabase-server";
import { env } from "@/lib/env";
import { toolRunSummary } from "./memory";
import { newId, nowIso } from "@/lib/utils/ids";

/**
 * Postgres implementation of the Repo port (DATA_MODE=supabase). Behavior
 * matches MemoryRepo, which is the executable spec.
 *
 * Every query runs on the server with the secret key (see D-013 in
 * memory/decisions.md): the browser never queries tables, and the pipeline
 * keeps writing after the request's cookies are gone (SSE stream). Because
 * the secret key bypasses RLS, ownership is enforced here: EVERY read and
 * write of user data filters by `user_id = userId`. RLS stays on as the
 * second wall for any future browser-side access.
 */
const PROFILE_COLS =
  "id,email,plan,credits_remaining,stripe_customer_id,stripe_subscription_id,current_period_end,created_at";
const LISTING_COLS = "id,user_id,status,input,result,edited,last_run_id,created_at,updated_at";

export class SupabaseRepo implements Repo {
  private readonly db: SupabaseClient;

  constructor(db?: SupabaseClient) {
    this.db = db ?? createSupabaseAdminClient();
  }

  async ensureProfile(user: SessionUser): Promise<Profile> {
    const existing = await this.getProfile(user.id);
    if (existing) return existing;
    // The auth trigger normally creates the row; this covers users created
    // before the migration ran. ignoreDuplicates keeps an existing balance.
    const { error } = await this.db
      .from("profiles")
      .upsert(
        { id: user.id, email: user.email, credits_remaining: env().FREE_RUNS },
        { onConflict: "id", ignoreDuplicates: true },
      );
    check(error, "ensureProfile");
    const created = await this.getProfile(user.id);
    if (!created) throw new Error("Could not create the profile.");
    return created;
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.db
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", userId)
      .maybeSingle();
    check(error, "getProfile");
    return data ? toProfile(data) : null;
  }

  async getProfileByStripeCustomer(customerId: string): Promise<Profile | null> {
    const { data, error } = await this.db
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    check(error, "getProfileByStripeCustomer");
    return data ? toProfile(data) : null;
  }

  // One UPDATE ... WHERE credits_remaining > 0 inside the SQL function, so two
  // concurrent runs can never spend the same credit.
  async consumeCredit(userId: string): Promise<CreditResult> {
    const { data, error } = await this.db.rpc("consume_credit", { p_user_id: userId });
    check(error, "consumeCredit");
    if (data === null || data === undefined) return { ok: false, remaining: 0 };
    return { ok: true, remaining: Number(data) };
  }

  async refundCredit(userId: string): Promise<void> {
    const { error } = await this.db.rpc("refund_credit", { p_user_id: userId });
    check(error, "refundCredit");
  }

  async setPlan(userId: string, update: Parameters<Repo["setPlan"]>[1]): Promise<void> {
    const row: Record<string, unknown> = {
      plan: update.plan,
      credits_remaining: update.credits,
    };
    if (update.stripe_customer_id !== undefined) row.stripe_customer_id = update.stripe_customer_id;
    if (update.stripe_subscription_id !== undefined)
      row.stripe_subscription_id = update.stripe_subscription_id;
    if (update.current_period_end !== undefined) row.current_period_end = update.current_period_end;
    const { error } = await this.db.from("profiles").update(row).eq("id", userId);
    check(error, "setPlan");
  }

  async createListing(userId: string, input: ProductInput): Promise<Listing> {
    const now = nowIso();
    const listing: Listing = {
      id: newId("lst"),
      user_id: userId,
      created_at: now,
      updated_at: now,
      status: "draft",
      input,
      result: null,
      edited: null,
      last_run_id: null,
    };
    const { error } = await this.db.from("listings").insert(listing);
    check(error, "createListing");
    return listing;
  }

  async getListing(userId: string, listingId: string): Promise<Listing | null> {
    const { data, error } = await this.db
      .from("listings")
      .select(LISTING_COLS)
      .eq("id", listingId)
      .eq("user_id", userId)
      .maybeSingle();
    check(error, "getListing");
    return data ? toListing(data) : null;
  }

  async listListings(userId: string): Promise<ListingSummary[]> {
    // Select only what the dashboard needs: input holds base64 photos.
    const { data, error } = await this.db
      .from("listings")
      .select(
        "id,status,created_at,updated_at,title_zh:input->>title_zh,platforms:input->platforms,channels:result->channels",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    check(error, "listListings");
    return (data ?? []).map((row) => {
      const r = row as unknown as SummaryRow;
      const channels = r.channels ?? [];
      return {
        id: r.id,
        status: r.status,
        created_at: iso(r.created_at),
        updated_at: iso(r.updated_at),
        title: channels[0]?.listing?.title ?? r.title_zh ?? "",
        platforms: r.platforms ?? [],
        score: channels.length
          ? Math.round(channels.reduce((s, c) => s + (c.score?.total ?? 0), 0) / channels.length)
          : null,
      };
    });
  }

  async markListingRunning(userId: string, listingId: string, runId: string): Promise<void> {
    const { data, error } = await this.db
      .from("listings")
      .update({ status: "running", last_run_id: runId, updated_at: nowIso() })
      .eq("id", listingId)
      .eq("user_id", userId)
      .select("id");
    check(error, "markListingRunning");
    if (!data?.length) throw new Error("Listing not found");
  }

  async saveRun(userId: string, run: RunRecord, result: PipelineResult | null): Promise<void> {
    const listing = await this.getListing(userId, run.listing_id);
    if (!listing) return;
    const { error: runError } = await this.db.from("pipeline_runs").upsert({
      id: run.id,
      listing_id: run.listing_id,
      user_id: userId,
      status: run.status,
      ai_mode: run.ai_mode,
      usage: run.usage,
      spans: run.spans,
      error: run.error,
      started_at: run.started_at,
      finished_at: run.finished_at,
    });
    check(runError, "saveRun");
    const update: Record<string, unknown> = {
      status: run.status === "completed" ? "completed" : "failed",
      updated_at: nowIso(),
    };
    if (result) {
      update.result = result;
      update.edited = null;
    }
    const { error } = await this.db
      .from("listings")
      .update(update)
      .eq("id", run.listing_id)
      .eq("user_id", userId);
    check(error, "saveRun");
  }

  async getRun(userId: string, runId: string): Promise<RunRecord | null> {
    const { data, error } = await this.db
      .from("pipeline_runs")
      .select("id,listing_id,status,ai_mode,usage,spans,error,started_at,finished_at")
      .eq("id", runId)
      .eq("user_id", userId)
      .maybeSingle();
    check(error, "getRun");
    if (!data) return null;
    const r = data as unknown as RunRecord;
    return {
      ...r,
      started_at: iso(r.started_at),
      finished_at: r.finished_at ? iso(r.finished_at) : null,
    };
  }

  async saveEdits(
    userId: string,
    listingId: string,
    platform: Platform,
    edited: ListingDraft,
  ): Promise<Listing> {
    const listing = await this.getListing(userId, listingId);
    if (!listing) throw new Error("Listing not found");
    const next = { ...(listing.edited ?? {}), [platform]: edited };
    const updated_at = nowIso();
    const { error } = await this.db
      .from("listings")
      .update({ edited: next, updated_at })
      .eq("id", listingId)
      .eq("user_id", userId);
    check(error, "saveEdits");
    return { ...listing, edited: next, updated_at };
  }

  async recordStripeEvent(eventId: string, type: string): Promise<boolean> {
    const { error } = await this.db.from("stripe_events").insert({ id: eventId, type });
    if (error?.code === "23505") return false; // already processed
    check(error, "recordStripeEvent");
    return true;
  }

  async releaseStripeEvent(eventId: string): Promise<void> {
    const { error } = await this.db.from("stripe_events").delete().eq("id", eventId);
    check(error, "releaseStripeEvent");
  }

  async addCredits(userId: string, amount: number): Promise<number> {
    const { data, error } = await this.db.rpc("add_credits", {
      p_user_id: userId,
      p_amount: Math.max(0, Math.floor(amount)),
    });
    check(error, "addCredits");
    if (data === null || data === undefined) throw new Error("No profile to add credits to.");
    return Number(data);
  }

  // ---- evidence library --------------------------------------------------

  async listEvidence(userId: string): Promise<EvidenceItem[]> {
    const { data, error } = await this.db
      .from("evidence")
      .select(EVIDENCE_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    check(error, "listEvidence");
    return (data ?? []).map(toEvidence);
  }

  async createEvidence(userId: string, input: EvidenceInput): Promise<EvidenceItem> {
    const item: EvidenceItem = {
      ...input,
      id: newId("evd"),
      user_id: userId,
      created_at: nowIso(),
    };
    const { error } = await this.db.from("evidence").insert(item);
    check(error, "createEvidence");
    return item;
  }

  async deleteEvidence(userId: string, evidenceId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("evidence")
      .delete()
      .eq("id", evidenceId)
      .eq("user_id", userId)
      .select("id");
    check(error, "deleteEvidence");
    return (data?.length ?? 0) > 0;
  }

  // ---- audits and appeals -------------------------------------------------

  async createToolRun<K extends ToolKind>(
    userId: string,
    kind: K,
    input: ToolRunOf<K>["input"],
  ): Promise<ToolRunOf<K>> {
    const now = nowIso();
    const run = {
      id: newId(kind === "audit" ? "aud" : "apl"),
      user_id: userId,
      kind,
      status: "running" as const,
      input,
      result: null,
      error: null,
      created_at: now,
      updated_at: now,
    };
    const { error } = await this.db.from("tool_runs").insert(run);
    check(error, "createToolRun");
    return run as unknown as ToolRunOf<K>;
  }

  async saveToolRun<K extends ToolKind>(
    userId: string,
    runId: string,
    update: { status: ToolRunStatus; result: ToolRunOf<K>["result"]; error: string | null },
  ): Promise<void> {
    const { data, error } = await this.db
      .from("tool_runs")
      .update({ ...update, updated_at: nowIso() })
      .eq("id", runId)
      .eq("user_id", userId)
      .select("id");
    check(error, "saveToolRun");
    if (!data?.length) throw new Error("Run not found");
  }

  async getToolRun(userId: string, runId: string): Promise<ToolRun | null> {
    const { data, error } = await this.db
      .from("tool_runs")
      .select(TOOL_RUN_COLS)
      .eq("id", runId)
      .eq("user_id", userId)
      .maybeSingle();
    check(error, "getToolRun");
    return data ? toToolRun(data) : null;
  }

  async listToolRuns(userId: string, kind?: ToolKind): Promise<ToolRunSummary[]> {
    let q = this.db.from("tool_runs").select(TOOL_RUN_COLS).eq("user_id", userId);
    if (kind) q = q.eq("kind", kind);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
    check(error, "listToolRuns");
    return (data ?? []).map((row) => toolRunSummary(toToolRun(row)));
  }

  // ---- account -----------------------------------------------------------

  async exportUserData(userId: string): Promise<UserDataExport> {
    const [profile, listings, runs, toolRuns, evidence] = await Promise.all([
      this.getProfile(userId),
      this.db.from("listings").select(LISTING_COLS).eq("user_id", userId),
      this.db
        .from("pipeline_runs")
        .select("id,listing_id,status,ai_mode,usage,error,started_at,finished_at")
        .eq("user_id", userId),
      this.db.from("tool_runs").select(TOOL_RUN_COLS).eq("user_id", userId),
      this.listEvidence(userId),
    ]);
    check(listings.error, "exportUserData");
    check(runs.error, "exportUserData");
    check(toolRuns.error, "exportUserData");
    return {
      exported_at: nowIso(),
      profile,
      listings: (listings.data ?? []).map(toListing),
      runs: (runs.data ?? []) as unknown as UserDataExport["runs"],
      tool_runs: (toolRuns.data ?? []).map(toToolRun),
      evidence,
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    // listings, runs, tool_runs and evidence cascade from the profile row.
    const { error } = await this.db.from("profiles").delete().eq("id", userId);
    check(error, "deleteUserData");
  }
}

const EVIDENCE_COLS = "id,user_id,name,kind,issuer,reference,claims,expires_on,notes,created_at";
const TOOL_RUN_COLS = "id,user_id,kind,status,input,result,error,created_at,updated_at";

function toEvidence(row: unknown): EvidenceItem {
  const e = row as EvidenceItem;
  return { ...e, claims: e.claims ?? [], created_at: iso(e.created_at) };
}

function toToolRun(row: unknown): ToolRun {
  const r = row as ToolRun;
  return { ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
}

interface SummaryRow {
  id: string;
  status: Listing["status"];
  created_at: string;
  updated_at: string;
  title_zh: string | null;
  platforms: Platform[] | null;
  channels: { listing?: { title?: string }; score?: { total?: number } }[] | null;
}

function check(error: { message: string; code?: string } | null, op: string): void {
  if (error) throw new Error(`Database error in ${op}: ${error.message}`);
}

/** Postgres returns "2026-10-19 08:00:00.123+00"-style strings; normalize to ISO. */
function iso(ts: string): string {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toISOString();
}

function toProfile(row: unknown): Profile {
  const p = row as Profile;
  return {
    ...p,
    created_at: iso(p.created_at),
    current_period_end: p.current_period_end ? iso(p.current_period_end) : null,
  };
}

function toListing(row: unknown): Listing {
  const l = row as Listing;
  return { ...l, created_at: iso(l.created_at), updated_at: iso(l.updated_at) };
}
