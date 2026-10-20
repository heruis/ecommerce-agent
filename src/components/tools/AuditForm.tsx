"use client";

import { FileSearch } from "lucide-react";
import { useState } from "react";
import { PLATFORMS, type AuditInputDraft, type Platform } from "@/lib/contracts";
import { useT } from "@/lib/i18n/client";
import { Button, Card, Input, Label, Select, Spinner, Textarea } from "@/components/ui";
import { ToolError } from "./ToolError";
import { ToolProgress } from "./ToolProgress";
import { useToolStream } from "./useToolStream";

/** Paste a live listing and audit it (1 credit). Owner: WS3. */
export function AuditForm() {
  const t = useT().tools;
  const f = t.audit.form;
  const { events, running, error, start } = useToolStream("audit");
  const [form, setForm] = useState<AuditInputDraft>({
    platform: "amazon_us",
    listing_text: "",
    notes: "",
    evidence: "",
    brand: "",
  });
  const set = (key: keyof AuditInputDraft) => (e: { target: { value: string } }) =>
    setForm((x) => ({ ...x, [key]: e.target.value }));
  const fieldError = (k: string) =>
    error?.fields?.[k] ? <p className="mt-1 text-xs text-danger">{error.fields[k]}</p> : null;

  return (
    <div className="space-y-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void start(form);
        }}
      >
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="audit-platform">{t.common.platform}</Label>
              <Select
                id="audit-platform"
                value={form.platform}
                onChange={(e) => setForm((x) => ({ ...x, platform: e.target.value as Platform }))}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {t.platforms[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="audit-brand">{f.brand}</Label>
              <Input id="audit-brand" value={form.brand} onChange={set("brand")} maxLength={80} />
            </div>
          </div>
          <div>
            <Label htmlFor="audit-listing" hint={f.listingHint}>
              {f.listing}
            </Label>
            <Textarea
              id="audit-listing"
              rows={12}
              required
              value={form.listing_text}
              onChange={set("listing_text")}
              placeholder={f.listingPlaceholder}
              className="font-mono text-sm"
            />
            {fieldError("listing_text")}
          </div>
          <div>
            <Label htmlFor="audit-notes" hint={f.notesHint}>
              {f.notes}
            </Label>
            <Textarea id="audit-notes" rows={3} value={form.notes} onChange={set("notes")} />
          </div>
          <div>
            <Label htmlFor="audit-evidence" hint={t.common.evidenceHint}>
              {t.common.evidence}
            </Label>
            <Textarea
              id="audit-evidence"
              rows={2}
              value={form.evidence}
              onChange={set("evidence")}
              placeholder={t.common.evidencePlaceholder}
            />
          </div>
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="accent" size="lg" disabled={running}>
            {running ? <Spinner /> : <FileSearch aria-hidden className="h-5 w-5" />}
            {running ? f.running : f.submit}
          </Button>
          <span className="text-sm text-muted">{t.common.credit}</span>
        </div>
      </form>
      {error ? <ToolError error={error} /> : null}
      {running || events.length > 0 ? <ToolProgress kind="audit" events={events} /> : null}
    </div>
  );
}
