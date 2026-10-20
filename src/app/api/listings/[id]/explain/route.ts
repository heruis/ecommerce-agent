import { NextResponse } from "next/server";
import { z } from "zod";
import { ExplanationLanguage, Platform } from "@/lib/contracts";
import { runExplain } from "@/lib/agents/explain/agent";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { redactForLog } from "@/lib/guardrails";
import { Budget, errorMessage, getLlmClient, Tracer } from "@/lib/harness";
import { apiError, notFound, readJson, unauthorized, validationError } from "@/lib/http/responses";
import { rateLimit } from "@/lib/platform/rate-limit";
import { channelView } from "@/lib/report";
import { newId } from "@/lib/utils/ids";

const Body = z.object({ platform: Platform, language: ExplanationLanguage.default("zh") });

/**
 * Explain one channel's listing in the seller's language (default 简体中文):
 * summary, back-translation and a note per reviewed claim. Free (no credit),
 * rate limited, one fast-tier call with a small budget.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);

  const listing = await getRepo().getListing(user.id, id);
  if (!listing) return notFound("Listing");
  const view = channelView(listing, parsed.data.platform);
  if (!listing.result || !view) {
    return apiError(400, "bad_platform", "That channel is not part of this listing.");
  }

  const limit = rateLimit(`explain:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return apiError(429, "rate_limited", "Too many requests in a minute. Try again shortly.", {
      retry_after_ms: limit.retryAfterMs,
    });
  }

  try {
    const explanation = await runExplain(
      {
        runId: newId("exp"),
        llm: getLlmClient(),
        tracer: new Tracer(redactForLog),
        budget: new Budget({
          maxLlmCalls: 3,
          maxTotalTokens: 60_000,
          maxCostUsd: 0.1,
          deadlineMs: 60_000,
        }),
        spanId: null,
        emit: () => {},
      },
      {
        platform: view.platform,
        listing: view.listing,
        compliance: listing.result.compliance,
        risk: view.risk,
        needsReview: view.gate.needs_review,
        language: parsed.data.language,
      },
    );
    const claims = listing.result.compliance.claims.map((c) => ({
      id: c.id,
      claim_text: c.claim_text,
      status: c.status,
    }));
    return NextResponse.json({ explanation, claims });
  } catch (e) {
    return apiError(502, "explain_failed", `Could not explain this listing: ${errorMessage(e)}`);
  }
}
