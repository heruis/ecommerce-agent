import { AuditInput } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { apiError, readJson, unauthorized, validationError } from "@/lib/http/responses";
import { runAudit, screenAuditInput } from "@/lib/pipeline/audit";
import { startToolRun } from "@/lib/pipeline/tool-route";

export const maxDuration = 300;

/**
 * Audit a live listing (1 credit). Streams progress as server-sent events.
 * auth -> validate -> input screen (no charge) -> rate limit -> credit -> run -> save
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const parsed = AuditInput.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);

  const blocked = screenAuditInput(parsed.data);
  if (blocked) return apiError(422, "guardrail_blocked", blocked);

  return startToolRun({
    user,
    kind: "audit",
    input: parsed.data,
    run: ({ runId, emit }) => runAudit(parsed.data, { runId, emit }),
  });
}
