"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, getDictionary, type Dictionary, type Locale } from ".";

const LocaleContext = createContext<{ locale: Locale; t: Dictionary }>({
  locale: DEFAULT_LOCALE,
  t: getDictionary(DEFAULT_LOCALE),
});

/** Set once in the root layout; Client Components read it with useT(). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <LocaleContext.Provider value={{ locale, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useT(): Dictionary {
  return useContext(LocaleContext).t;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
