import { AppealInput } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { apiError, readJson, unauthorized, validationError } from "@/lib/http/responses";
import { getLocale } from "@/lib/i18n/server";
import { runAppeal, screenAppealInput } from "@/lib/pipeline/appeal";
import { startToolRun } from "@/lib/pipeline/tool-route";

export const maxDuration = 300;

/**
 * Takedown / appeal help (1 credit). Explanations follow the seller's
 * interface language; the appeal itself is always English.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const parsed = AppealInput.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);

  const blocked = screenAppealInput(parsed.data);
  if (blocked) return apiError(422, "guardrail_blocked", blocked);

  const language = (await getLocale()) === "zh" ? "zh" : "en";
  return startToolRun({
    user,
    kind: "appeal",
    input: parsed.data,
    run: ({ runId, emit }) => runAppeal(parsed.data, { runId, emit, language }),
  });
}
