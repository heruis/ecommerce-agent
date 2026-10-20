"use client";

import { Printer } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui";

export function PrintButton() {
  const t = useT().app.report;
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden className="h-4 w-4" />
      {t.print}
    </Button>
  );
}
