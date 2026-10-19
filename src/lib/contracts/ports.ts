/**
 * CONTRACTS — ports (interfaces) between layers.
 *
 * Each port has a reference implementation that works with zero setup
 * (in-memory / mock) and a production implementation owned by a workstream.
 * Routes and agents depend on these interfaces, never on a concrete vendor SDK.
 */
import type { ListingDraft, Platform, PolicyRef, ProductInput } from "./schemas";
import type { Listing, ListingSummary, Plan, Profile, RunRecord } from "./records";
import type { PipelineResult } from "./schemas";

// ---------------------------------------------------------------------------
// Auth (WS4)
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Data access (WS4). Every method takes userId and filters by it, so a user
// can never read another user's listing by guessing an id (IDOR guard).
// ---------------------------------------------------------------------------

export interface CreditResult {
  ok: boolean;
  remaining: number;
}

export interface Repo {
  ensureProfile(user: SessionUser): Promise<Profile>;
  getProfile(userId: string): Promise<Profile | null>;
  getProfileByStripeCustomer(customerId: string): Promise<Profile | null>;

  /** Atomically take one credit. Concurrent calls must never overspend. */
  consumeCredit(userId: string): Promise<CreditResult>;
  /** Give a credit back when a run fails for a system reason (not user error). */
  refundCredit(userId: string): Promise<void>;
  setPlan(
    userId: string,
    update: {
      plan: Plan;
      credits: number;
      stripe_customer_id?: string | null;
      stripe_subscription_id?: string | null;
      current_period_end?: string | null;
    },
  ): Promise<void>;

  createListing(userId: string, input: ProductInput): Promise<Listing>;
  getListing(userId: string, listingId: string): Promise<Listing | null>;
  listListings(userId: string): Promise<ListingSummary[]>;
  markListingRunning(userId: string, listingId: string, runId: string): Promise<void>;
  saveRun(userId: string, run: RunRecord, result: PipelineResult | null): Promise<void>;
  getRun(userId: string, runId: string): Promise<RunRecord | null>;
  /** Save the seller's edited copy for one channel (other channels keep theirs). */
  saveEdits(
    userId: string,
    listingId: string,
    platform: Platform,
    edited: ListingDraft,
  ): Promise<Listing>;

  /** Returns true the first time an event id is seen, false for duplicates. */
  recordStripeEvent(eventId: string, type: string): Promise<boolean>;
  /** Forget an event whose handler failed, so Stripe's retry is applied. */
  releaseStripeEvent(eventId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Billing (WS4)
// ---------------------------------------------------------------------------

export interface BillingProvider {
  createCheckoutSession(user: SessionUser): Promise<{ url: string }>;
  createPortalSession(user: SessionUser): Promise<{ url: string }>;
}

// ---------------------------------------------------------------------------
// Retrieval over the compliance knowledge base (WS2)
// ---------------------------------------------------------------------------

export interface RetrievedChunk extends PolicyRef {
  text: string;
  score: number;
}

export interface PolicyRetriever {
  readonly kind: "lexical" | "vector";
  search(
    query: string,
    opts?: { k?: number; platforms?: readonly string[] },
  ): Promise<RetrievedChunk[]>;
}
