import { Fragment } from "react";
import { SAMPLE_RISKY_PHRASES, SAMPLE_SUPPLIER_TEXT } from "@/components/preview/sample";

/**
 * The sample supplier copy with each risky phrase marked (red underline +
 * strike-through color), so the "before" state reads at a glance. Owner: WS3.
 */
export function SupplierNote({ className }: { className?: string }) {
  const phrases = SAMPLE_RISKY_PHRASES.map((p) => p.zh);
  const pattern = new RegExp(`(${phrases.map(escape).join("|")})`, "g");
  const parts = SAMPLE_SUPPLIER_TEXT.split(pattern);
  return (
    <p lang="zh-CN" className={className}>
      {parts.map((part, i) =>
        phrases.includes(part) ? (
          <mark
            key={i}
            className="rounded bg-danger/10 px-0.5 text-danger underline decoration-danger decoration-wavy underline-offset-4"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
