"use client";

import { Gavel } from "lucide-react";
import { useState } from "react";
import { PLATFORMS, type AppealInputDraft, type Platform } from "@/lib/contracts";
import { useT } from "@/lib/i18n/client";
import { Button, Card, Label, Select, Spinner, Textarea } from "@/components/ui";
import { ToolError } from "./ToolError";
import { ToolProgress } from "./ToolProgress";
import { useToolStream } from "./useToolStream";

/** Paste a takedown / suppression notice and get the cause, fix and an appeal (1 credit). Owner: WS3. */
export function AppealForm() {
  const t = useT().tools;
  const f = t.appeal.form;
  const { events, running, error, start } = useToolStream("appeal");
  const [form, setForm] = useState<AppealInputDraft>({
    platform: "amazon_us",
    notice: "",
    listing_text: "",
    seller_note: "",
    evidence: "",
  });
  const set = (key: keyof AppealInputDraft) => (e: { target: { value: string } }) =>
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
          <div className="sm:w-1/2">
            <Label htmlFor="appeal-platform">{t.common.platform}</Label>
            <Select
              id="appeal-platform"
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
            <Label htmlFor="appeal-notice" hint={f.noticeHint}>
              {f.notice}
            </Label>
            <Textarea
              id="appeal-notice"
              rows={8}
              required
              value={form.notice}
              onChange={set("notice")}
              placeholder={f.noticePlaceholder}
            />
            {fieldError("notice")}
          </div>
          <div>
            <Label htmlFor="appeal-listing" hint={f.listingHint}>
              {f.listing}
            </Label>
            <Textarea
              id="appeal-listing"
              rows={5}
              value={form.listing_text}
              onChange={set("listing_text")}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="appeal-note">{f.note}</Label>
            <Textarea
              id="appeal-note"
              rows={2}
              value={form.seller_note}
              onChange={set("seller_note")}
            />
          </div>
          <div>
            <Label htmlFor="appeal-evidence" hint={t.common.evidenceHint}>
              {t.common.evidence}
            </Label>
            <Textarea
              id="appeal-evidence"
              rows={2}
              value={form.evidence}
              onChange={set("evidence")}
              placeholder={t.common.evidencePlaceholder}
            />
          </div>
        </Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="accent" size="lg" disabled={running}>
            {running ? <Spinner /> : <Gavel aria-hidden className="h-5 w-5" />}
            {running ? f.running : f.submit}
          </Button>
          <span className="text-sm text-muted">{t.common.credit}</span>
        </div>
      </form>
      {error ? <ToolError error={error} /> : null}
      {running || events.length > 0 ? <ToolProgress kind="appeal" events={events} /> : null}
    </div>
  );
}
