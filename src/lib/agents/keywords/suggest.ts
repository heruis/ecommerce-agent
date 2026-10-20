import type { ProductFacts } from "@/lib/contracts";

/**
 * Real shopper phrases: what Amazon US's own search box suggests for a seed
 * phrase. A signal for the keyword agent, never a requirement: any failure
 * (blocked, slow, changed format) returns an empty list and the pipeline
 * carries on with model-suggested keywords. Phrases are untrusted external
 * text and reach the model as data inside tags.
 *
 * Ported from the team's Listing Copilot prototype. Owner: WS1.
 */
export type Suggest = (seed: string) => Promise<string[]>;

const AMAZON_US = { host: "completion.amazon.com", marketplaceId: "ATVPDKIKX0DER" };
const TIMEOUT_MS = 2500;
const MAX_SEEDS = 3;
const MAX_PHRASES = 20;

export const fetchAmazonSuggestions: Suggest = async (seed) => {
  const prefix = seed.trim().toLowerCase();
  if (!prefix) return [];
  const url =
    `https://${AMAZON_US.host}/api/2017/suggestions?limit=10&alias=aps` +
    `&mid=${AMAZON_US.marketplaceId}&prefix=${encodeURIComponent(prefix)}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { suggestions?: { value?: unknown }[] };
    return (body.suggestions ?? [])
      .map((s) => (typeof s.value === "string" ? s.value : ""))
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    return [];
  }
};

/** Seed phrases from the product record: its type, plus material and key feature variants. */
export function seedsFor(facts: ProductFacts): string[] {
  const type = facts.product_type.toLowerCase().trim();
  const noun = type.split(" ").slice(-1)[0] ?? type;
  const material = facts.facts
    .find((f) => f.attribute === "material")
    ?.value.toLowerCase()
    .replace(/^food-grade\s+/, "");
  const feature = facts.facts.find((f) => f.attribute === "feature")?.value.toLowerCase();
  return [type, material ? `${material} ${noun}` : "", feature ? `${feature} ${noun}` : ""]
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** A few seeds, de-duplicated and capped, fetched in parallel; lowercase phrases out. */
export async function keywordSignals(seeds: string[], suggest: Suggest): Promise<string[]> {
  const unique = [...new Set(seeds.map((s) => s.trim().toLowerCase()).filter(Boolean))].slice(
    0,
    MAX_SEEDS,
  );
  const lists = await Promise.all(unique.map((s) => suggest(s).catch(() => [])));
  return [
    ...new Set(
      lists
        .flat()
        .map((p) => p.trim().toLowerCase().replace(/\s+/g, " "))
        // Phrases are data, never instructions: keep them short and plain.
        .filter((p) => p.length > 1 && p.length <= 80 && !/[<>{}]/.test(p)),
    ),
  ].slice(0, MAX_PHRASES);
}

/** Final keywords that are exactly a real search-box phrase. */
export function fromSearchBox(keywords: string[], suggestions: string[]): string[] {
  const seen = new Set(suggestions.map((s) => s.trim().toLowerCase()));
  return [...new Set(keywords.filter((k) => seen.has(k.trim().toLowerCase())))];
}
