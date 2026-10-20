import type { ProductFacts } from "@/lib/contracts";

/**
 * Chinese supplier copy names plastics by abbreviation ("PP材质"). US shoppers
 * search for the material name, so the full name is spelled out in code and
 * the abbreviation kept: "PP" -> "polypropylene (PP)". Deterministic, so the
 * listing never depends on whether the model happened to expand it.
 */
const MATERIALS: [abbr: string, name: string][] = [
  ["HDPE", "high-density polyethylene"],
  ["LDPE", "low-density polyethylene"],
  ["PP", "polypropylene"],
  ["PE", "polyethylene"],
  ["PET", "polyethylene terephthalate"],
  ["PC", "polycarbonate"],
  ["PS", "polystyrene"],
  ["PVC", "polyvinyl chloride"],
  ["TPE", "thermoplastic elastomer"],
  ["TPU", "thermoplastic polyurethane"],
  ["PU", "polyurethane"],
  ["EVA", "ethylene-vinyl acetate"],
  ["PMMA", "acrylic"],
];

/** "PP" -> "polypropylene (PP)"; values that already name the material are left alone. */
export function expandMaterialAbbreviations(value: string): string {
  let out = value;
  for (const [abbr, name] of MATERIALS) {
    if (out.toLowerCase().includes(name)) continue;
    out = out.replace(new RegExp(`(?<![\\w(])${abbr}(?![\\w)])`), `${name} (${abbr})`);
  }
  return out;
}

/** Apply the glossary to every material fact. */
export function normalizeMaterials(facts: ProductFacts): ProductFacts {
  return {
    ...facts,
    facts: facts.facts.map((f) =>
      /material/i.test(f.attribute) ? { ...f, value: expandMaterialAbbreviations(f.value) } : f,
    ),
  };
}
