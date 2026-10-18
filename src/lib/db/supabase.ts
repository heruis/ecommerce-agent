import "server-only";
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

/**
 * Postgres implementation of the Repo port (DATA_MODE=supabase).
 *
 * TODO(WS4): implement every method. The behavior must match MemoryRepo
 * exactly (it is the executable spec) and pass src/lib/db/repo.contract.test.ts
 * when pointed at a Supabase test project.
 *
 * Which client to use:
 *  - listings, pipeline_runs, profile reads -> createSupabaseServerClient()
 *    (runs as the signed-in user; RLS enforces ownership). STILL add
 *    `.eq("user_id", userId)` on every query: defense in depth.
 *  - consumeCredit / refundCredit -> admin client + rpc("consume_credit")
 *    / rpc("refund_credit"). consume_credit returns null when out of credits.
 *  - setPlan, getProfileByStripeCustomer, recordStripeEvent -> admin client
 *    (called from the Stripe webhook, which has no user session).
 *  - recordStripeEvent: insert into stripe_events; a unique-violation error
 *    (code 23505) means "already processed" -> return false.
 *  - saveRun: upsert pipeline_runs, then update listings.status/result/
 *    last_run_id, and set edited = null when a new result arrives.
 * Map snake_case columns 1:1 to the contract types; jsonb columns hold
 * input/result/edited/usage/spans.
 */
export class SupabaseRepo implements Repo {
  private todo(method: string): never {
    throw new Error(
      `SupabaseRepo.${method} is not implemented yet (WS4). Use DATA_MODE=memory meanwhile.`,
    );
  }

  async ensureProfile(user: SessionUser): Promise<Profile> {
    void user;
    return this.todo("ensureProfile");
  }
  async getProfile(userId: string): Promise<Profile | null> {
    void userId;
    return this.todo("getProfile");
  }
  async getProfileByStripeCustomer(customerId: string): Promise<Profile | null> {
    void customerId;
    return this.todo("getProfileByStripeCustomer");
  }
  async consumeCredit(userId: string): Promise<CreditResult> {
    void userId;
    return this.todo("consumeCredit");
  }
  async refundCredit(userId: string): Promise<void> {
    void userId;
    return this.todo("refundCredit");
  }
  async setPlan(userId: string, update: Parameters<Repo["setPlan"]>[1]): Promise<void> {
    void userId;
    void update;
    return this.todo("setPlan");
  }
  async createListing(userId: string, input: ProductInput): Promise<Listing> {
    void userId;
    void input;
    return this.todo("createListing");
  }
  async getListing(userId: string, listingId: string): Promise<Listing | null> {
    void userId;
    void listingId;
    return this.todo("getListing");
  }
  async listListings(userId: string): Promise<ListingSummary[]> {
    void userId;
    return this.todo("listListings");
  }
  async markListingRunning(userId: string, listingId: string, runId: string): Promise<void> {
    void userId;
    void listingId;
    void runId;
    return this.todo("markListingRunning");
  }
  async saveRun(userId: string, run: RunRecord, result: PipelineResult | null): Promise<void> {
    void userId;
    void run;
    void result;
    return this.todo("saveRun");
  }
  async getRun(userId: string, runId: string): Promise<RunRecord | null> {
    void userId;
    void runId;
    return this.todo("getRun");
  }
  async saveEdits(userId: string, listingId: string, edited: ListingDraft): Promise<Listing> {
    void userId;
    void listingId;
    void edited;
    return this.todo("saveEdits");
  }
  async recordStripeEvent(eventId: string, type: string): Promise<boolean> {
    void eventId;
    void type;
    return this.todo("recordStripeEvent");
  }
}
