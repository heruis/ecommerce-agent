/**
 * Interface languages. Chinese sellers are the primary users, so the whole
 * product is available in 简体中文; English is the default. Add a language by
 * adding it here and a folder under dictionaries/ with the same shape as en/.
 */
export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "sp_locale";

export const LOCALE_LABELS: Record<Locale, string> = { en: "English", zh: "简体中文" };
/** Value for <html lang>. */
export const HTML_LANG: Record<Locale, string> = { en: "en", zh: "zh-CN" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Pick a supported locale from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    if (tag.startsWith("zh")) return "zh";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}
