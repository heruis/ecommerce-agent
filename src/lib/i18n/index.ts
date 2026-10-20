import type { Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { zh } from "./dictionaries/zh";

export * from "./config";
export { fmt } from "./format";
export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { en, zh };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
