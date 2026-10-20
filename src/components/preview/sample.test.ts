import { describe, expect, it } from "vitest";
import { allText } from "@/lib/guardrails/gate";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";
import { validateListing } from "@/lib/rules";
import { SAMPLE_AMAZON, SAMPLE_BRAND, SAMPLE_SHOPIFY, SAMPLE_TIKTOK } from "./sample";

/** The marketing pages say the demo output passes each channel's rules: keep that true. */
describe("marketing sample listings", () => {
  it.each([
    ["amazon_us", SAMPLE_AMAZON],
    ["tiktok_us", SAMPLE_TIKTOK],
    ["shopify", SAMPLE_SHOPIFY],
  ] as const)("%s sample passes its rule check with no restricted claims", (platform, listing) => {
    const report = validateListing(listing, platform, { brand: SAMPLE_BRAND });
    expect(report.violations.filter((v) => v.severity === "error")).toEqual([]);
    const restricted = scanClaims(allText(listing), "").filter((h) => h.status === "restricted");
    expect(restricted).toEqual([]);
  });
});
