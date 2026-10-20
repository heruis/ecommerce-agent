import "server-only";
import type { PipelineEvent, SessionUser, ToolKind, ToolRunOf } from "@/lib/contracts";
import { getRepo } from "@/lib/db";
import { apiError } from "@/lib/http/responses";
import { rateLimit } from "@/lib/platform/rate-limit";
import type { ToolOutcome, ToolStreamEvent } from "./tool-run";

/**
 * Route side of an audit or appeal, same order as the listing run route:
 *   (auth, body validation and the cheap input screen happen in the route)
 *   -> rate limit -> atomic credit -> create run -> stream progress -> save
 *   -> refund on our own failure (never on a guardrail block).
 */
export async function startToolRun<K extends ToolKind>(args: {
  user: SessionUser;
  kind: K;
  input: ToolRunOf<K>["input"];
  run: (opts: {
    runId: string;
    emit: (event: PipelineEvent) => void;
  }) => Promise<ToolOutcome<NonNullable<ToolRunOf<K>["result"]>>>;
}): Promise<Response> {
  const { user, kind } = args;
  const repo = getRepo();
  await repo.ensureProfile(user);

  const limit = rateLimit(`${kind}:${user.id}`, 5, 60_000);
  if (!limit.ok) {
    return apiError(429, "rate_limited", "Too many requests in a minute. Try again shortly.", {
      retry_after_ms: limit.retryAfterMs,
    });
  }

  const credit = await repo.consumeCredit(user.id);
  if (!credit.ok) {
    return apiError(
      402,
      "out_of_credits",
      "You have no credits left. Buy a credit pack or upgrade.",
    );
  }

  const record = await repo.createToolRun(user.id, kind, args.input);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ToolStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client went away; keep running so the result is still saved.
        }
      };
      send({ type: "tool_started", id: record.id, kind });
      try {
        const outcome = await args.run({ runId: record.id, emit: send });
        if (outcome.result) {
          await repo.saveToolRun<K>(user.id, record.id, {
            status: "completed",
            result: outcome.result as ToolRunOf<K>["result"],
            error: null,
          });
          send({ type: "tool_completed", id: record.id, kind });
        } else {
          const err = outcome.error;
          await repo.saveToolRun<K>(user.id, record.id, {
            status: "failed",
            result: null,
            error: err?.message ?? "Unknown error",
          });
          if (!err || err.refundable) await repo.refundCredit(user.id);
          send({
            type: "tool_failed",
            id: record.id,
            kind,
            error: err?.message ?? "Unknown error",
            code: err?.code ?? "internal",
          });
        }
      } catch (e) {
        await repo.refundCredit(user.id);
        await repo
          .saveToolRun<K>(user.id, record.id, {
            status: "failed",
            result: null,
            error: e instanceof Error ? e.message : "Unexpected error",
          })
          .catch(() => {});
        send({
          type: "tool_failed",
          id: record.id,
          kind,
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
