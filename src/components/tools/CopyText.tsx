"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Button, cn } from "@/components/ui";

/** Copy a value to the clipboard, with a translated label. Owner: WS3. */
export function CopyText({
  value,
  label,
  className,
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const t = useT().tools.common;
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={cn("shrink-0 print:hidden", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked: the text is still selectable on the page.
        }
      }}
    >
      {copied ? (
        <Check aria-hidden className="h-4 w-4" />
      ) : (
        <Copy aria-hidden className="h-4 w-4" />
      )}
      <span aria-live="polite">{copied ? t.copied : (label ?? t.copy)}</span>
    </Button>
  );
}
