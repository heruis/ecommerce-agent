"use client";

import Link from "next/link";
import type { EvidenceItem } from "@/lib/contracts";
import { expiry } from "@/lib/evidence";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/components/ui";
import { ExpiryBadge } from "./ExpiryBadge";
import { KindIcon } from "./KindIcon";

/**
 * Pick documents from the evidence library for one report. The chosen ones
 * are rendered into the evidence text on submit (lib/evidence). Expired
 * documents can be seen but not used. Owner: WS3.
 */
export function EvidencePicker({
  items,
  selected,
  onChange,
  today,
}: {
  items: EvidenceItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  today: string;
}) {
  const t = useT().app.evidence;
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">{t.pickerTitle}</legend>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{t.pickerHint}</span>
        <span className="flex items-center gap-3">
          {selected.length ? <span>{fmt(t.pickerSelected, { n: selected.length })}</span> : null}
          <Link href="/evidence" className="font-medium text-brand underline">
            {t.pickerManage}
          </Link>
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t.pickerEmpty}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => {
            const expired = expiry(item, new Date(today)).state === "expired";
            return (
              <li key={item.id}>
                <label
                  className={cn(
                    "flex min-h-11 gap-3 rounded-lg border border-border p-2.5 text-sm transition-colors duration-200 has-[:checked]:border-brand has-[:checked]:bg-brand/5",
                    expired
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:border-brand/40",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(item.id)}
                    disabled={expired}
                    onChange={() => toggle(item.id)}
                  />
                  <KindIcon kind={item.kind} className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">{item.name}</span>
                    <span className="block text-xs text-muted">
                      {item.claims.join(", ") || t.kinds[item.kind]}
                    </span>
                    <span className="mt-1 block">
                      <ExpiryBadge item={item} today={today} />
                      {expired ? <span className="ml-2 text-xs">{t.pickerExpired}</span> : null}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
