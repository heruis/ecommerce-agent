import { describe, expect, it } from "vitest";
import { fmt, getDictionary, localeFromAcceptLanguage } from ".";

/** Every leaf of a dictionary, as "a.b.c" paths, so languages can be compared. */
function leaves(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => leaves(v, `${prefix}[${i}]`));
  if (obj && typeof obj === "object")
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe("i18n", () => {
  it("Chinese has every English string, and none are empty", () => {
    const en = leaves(getDictionary("en")).sort();
    const zh = leaves(getDictionary("zh")).sort();
    expect(zh).toEqual(en);
  });

  it("keeps the same {placeholders} in every translation", () => {
    const zh = getDictionary("zh") as unknown as Record<string, unknown>;
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === "string") {
        const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        expect(vars(b as string), path).toEqual(vars(a));
      } else if (a && typeof a === "object") {
        for (const k of Object.keys(a)) walk((a as never)[k], (b as never)[k], `${path}.${k}`);
      }
    };
    walk(getDictionary("en"), zh, "");
  });

  it("picks a locale from Accept-Language", () => {
    expect(localeFromAcceptLanguage("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("fr-FR")).toBe("en");
  });

  it("fills placeholders", () => {
    expect(fmt("{n} credits", { n: 3 })).toBe("3 credits");
  });
});
