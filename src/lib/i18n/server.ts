import "server-only";
import { cookies, headers } from "next/headers";
import { getDictionary, isLocale, LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from ".";

/** The visitor's language: their saved choice, else the browser's preference. */
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

/** Server Components: `const t = await getT(); t.common.nav.pricing`. */
export async function getT() {
  return getDictionary(await getLocale());
}
