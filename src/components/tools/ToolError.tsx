"use client";

import { useT } from "@/lib/i18n/client";
import { Alert, ButtonLink } from "@/components/ui";
import type { ToolStreamError } from "./useToolStream";

/** Error states: out of credits (link to pricing), blocked input (no charge), our failure (refunded). */
export function ToolError({ error }: { error: ToolStreamError }) {
  const t = useT().tools.errors;
  if (error.code === "out_of_credits") {
    return (
      <Alert tone="warn" title={t.outOfCredits}>
        <ButtonLink href="/pricing" variant="accent" size="sm" className="mt-2">
          {t.buyCredits}
        </ButtonLink>
      </Alert>
    );
  }
  const blocked = error.code === "guardrail_blocked" || error.code === "invalid_input";
  const ours = !blocked && error.code !== "rate_limited" && error.code !== "network";
  return (
    <Alert tone="danger" title={error.message || t.generic}>
      {blocked ? t.noCharge : ours ? t.refunded : null}
    </Alert>
  );
}
