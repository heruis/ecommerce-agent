"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/i18n/client";

/** Switch the interface language; works before sign-in (saved in a cookie). Owner: WS3. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  return (
    <label className={className}>
      <span className="sr-only">{t.common.nav.language}</span>
      <span className="relative inline-flex items-center">
        <Languages aria-hidden className="pointer-events-none absolute left-2 h-4 w-4 text-muted" />
        <select
          value={locale}
          onChange={(e) => {
            const next = e.target.value as Locale;
            document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
            router.refresh();
          }}
          className="min-h-9 cursor-pointer appearance-none rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-sm hover:border-brand/40"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
