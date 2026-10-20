import { BadgeCheck, ClipboardList, File, FlaskConical, Receipt } from "lucide-react";
import type { EvidenceKind } from "@/lib/contracts";

const ICONS = {
  test_report: FlaskConical,
  certificate: BadgeCheck,
  registration: ClipboardList,
  invoice: Receipt,
  other: File,
} as const;

/** Decorative icon for a document type; the type is always also written out. */
export function KindIcon({ kind, className }: { kind: EvidenceKind; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden className={className ?? "h-5 w-5"} />;
}
