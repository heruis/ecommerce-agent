"use client";

import { CircleHelp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClarifyingQuestion, ProductInput } from "@/lib/contracts";
import { useLocale, useT } from "@/lib/i18n/client";
import { Alert, Button, Card, Label, Spinner, Textarea } from "@/components/ui";

/**
 * The run stopped after extraction because the input was too thin (code
 * decides, see agents/extraction/sufficiency.ts). Show the questions and let
 * the seller answer in place: the answers are appended to the description
 * and a new report starts with them. Owner: WS3.
 */
export function NeedsInfoCard({
  input,
  questions,
}: {
  input: ProductInput;
  questions: ClarifyingQuestion[];
}) {
  const t = useT().app.workspace;
  const locale = useLocale();
  const router = useRouter();
  const [answers, setAnswers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        description_zh: `${input.description_zh}\n\n${t.answersPrefix}：${answers.trim()}`,
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 201) {
      router.push(`/listings/${body.id}?run=1`);
      return;
    }
    setError(body?.error?.message ?? t.couldNotStart);
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <CircleHelp aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <h2 className="font-semibold">{t.needsInfoTitle}</h2>
          <p className="text-sm text-muted">{t.needsInfoNote}</p>
        </div>
      </div>
      <ol className="list-decimal space-y-1 pl-6 text-sm">
        {questions.map((q, i) => (
          <li key={i}>
            {locale === "zh" ? q.zh : q.en}
            {locale === "zh" ? null : <span className="ml-2 text-muted">{q.zh}</span>}
          </li>
        ))}
      </ol>
      <div>
        <Label htmlFor="needs-info-answers">{t.answersLabel}</Label>
        <Textarea
          id="needs-info-answers"
          rows={3}
          value={answers}
          onChange={(e) => setAnswers(e.target.value)}
          placeholder={t.answersPlaceholder}
        />
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button variant="accent" onClick={submit} disabled={busy || answers.trim().length < 2}>
        {busy ? <Spinner /> : null}
        {t.generateWithAnswers}
      </Button>
    </Card>
  );
}
