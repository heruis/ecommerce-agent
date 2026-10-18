import type { PipelineEvent } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { screenInput } from "@/lib/guardrails";
import { rateLimit } from "@/lib/platform/rate-limit";
import { apiError, notFound, unauthorized } from "@/lib/http/responses";
import { runPipeline } from "@/lib/pipeline";
import { newId } from "@/lib/utils/ids";

// The pipeline makes several model calls; give the function room (Vercel honors this).
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Run the agent pipeline for one listing and stream progress as
 * server-sent events. Order matters:
 *   auth -> ownership -> input screen -> rate limit -> atomic credit -> run -> save -> refund on our failure
 */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;

  const repo = getRepo();
  await repo.ensureProfile(user);
  const listing = await repo.getListing(user.id, id);
  if (!listing) return notFound("Listing");
  if (listing.status === "running")
    return apiError(409, "already_running", "This listing is already being generated.");

  const screen = screenInput(listing.input);
  if (screen.blocked)
    return apiError(422, "guardrail_blocked", screen.reason ?? "This input cannot be processed.");

  const limit = rateLimit(`run:${user.id}`, 5, 60_000);
  if (!limit.ok) {
    return apiError(429, "rate_limited", "Too many runs in a minute. Try again shortly.", {
      retry_after_ms: limit.retryAfterMs,
    });
  }

  const credit = await repo.consumeCredit(user.id);
  if (!credit.ok) {
    return apiError(
      402,
      "out_of_credits",
      "You have used all your runs. Upgrade to Pro to keep going.",
    );
  }

  const runId = newId("run");
  await repo.markListingRunning(user.id, id, runId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client went away; keep running so the result is still saved.
        }
      };
      try {
        const outcome = await runPipeline(listing.input, { runId, listingId: id, emit: send });
        await repo.saveRun(user.id, outcome.run, outcome.result);
        if (outcome.error?.refundable) await repo.refundCredit(user.id);
      } catch (e) {
        await repo.refundCredit(user.id);
        send({
          type: "run_failed",
          run_id: runId,
          error: e instanceof Error ? e.message : "Unexpected error",
          code: "internal",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Credits-Remaining": String(credit.remaining),
    },
  });
}
