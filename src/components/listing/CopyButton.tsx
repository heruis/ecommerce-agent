"use client";

import { useState } from "react";
import { cn } from "@/components/ui";

/** Copy one value to the clipboard, for pasting into Seller Center or Shopify admin. Owner: WS3. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
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
        "rounded-md border border-border px-2 py-0.5 text-xs hover:bg-background print:hidden",
        className,
      )}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
