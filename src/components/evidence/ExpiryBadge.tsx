"use client";

import type { EvidenceItem } from "@/lib/contracts";
import { expiry } from "@/lib/evidence";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Badge } from "@/components/ui";

/** Valid / expiring soon / expired, in words and color (never color alone). Owner: WS3. */
export function ExpiryBadge({ item, today }: { item: EvidenceItem; today: string }) {
  const t = useT().app.evidence;
  const { state, days } = expiry(item, new Date(today));
  switch (state) {
    case "no_expiry":
      return <Badge>{t.noExpiry}</Badge>;
    case "valid":
      return <Badge tone="ok">{fmt(t.valid, { date: item.expires_on ?? "" })}</Badge>;
    case "expiring":
      return (
        <Badge tone="warn">
          {days === 0 ? t.expiringToday : fmt(t.expiring, { days: days ?? 0 })}
        </Badge>
      );
    case "expired":
      return <Badge tone="danger">{fmt(t.expired, { date: item.expires_on ?? "" })}</Badge>;
  }
}
