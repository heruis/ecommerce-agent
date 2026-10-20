"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/components/ui";

/** Copy one value to the clipboard, for pasting into Seller Center or Shopify admin. Owner: WS3. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const t = useT().common.actions;
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (e.g. insecure context): the value is still selectable.
        }
      }}
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs font-medium transition-colors duration-200 hover:border-brand/40 hover:bg-subtle print:hidden",
        copied && "border-ok/40 text-ok",
        className,
      )}
    >
      {copied ? (
        <Check aria-hidden className="h-3.5 w-3.5" />
      ) : (
        <Copy aria-hidden className="h-3.5 w-3.5" />
      )}
      <span aria-live="polite">{copied ? t.copied : t.copy}</span>
    </button>
  );
}
