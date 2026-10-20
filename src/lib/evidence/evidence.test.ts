import { describe, expect, it } from "vitest";
import type { EvidenceItem } from "@/lib/contracts";
import { scanClaims } from "@/lib/guardrails";
import { evidenceText, expiry, mergeEvidence } from "./index";

const today = new Date("2026-10-20T12:00:00Z");

function doc(over: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "evd_1",
    user_id: "u_1",
    created_at: "2026-10-01T00:00:00.000Z",
    name: "SGS food-contact test report",
    kind: "test_report",
    issuer: "SGS",
    reference: "SHFD2026-0412",
    claims: ["BPA-free", "food-grade silicone"],
    expires_on: null,
    notes: "",
    ...over,
  };
}

describe("expiry", () => {
  it("classifies documents by days left", () => {
    expect(expiry(doc(), today)).toEqual({ state: "no_expiry", days: null });
    expect(expiry(doc({ expires_on: "2027-06-01" }), today).state).toBe("valid");
    expect(expiry(doc({ expires_on: "2026-11-05" }), today)).toEqual({
      state: "expiring",
      days: 16,
    });
    expect(expiry(doc({ expires_on: "2026-10-20" }), today)).toEqual({
      state: "expiring",
      days: 0,
    });
    expect(expiry(doc({ expires_on: "2026-10-19" }), today).state).toBe("expired");
  });
});

describe("evidenceText", () => {
  it("renders one line per usable document with issuer, reference and claims", () => {
    const text = evidenceText([doc()], today);
    expect(text).toContain("SGS food-contact test report (test report)");
    expect(text).toContain("issued by SGS");
    expect(text).toContain("ref. SHFD2026-0412");
    expect(text).toContain("supports: BPA-free, food-grade silicone");
  });

  it("leaves expired documents out and says so", () => {
    const text = evidenceText(
      [doc(), doc({ id: "evd_2", name: "Old LFGB certificate", expires_on: "2025-03-01" })],
      today,
    );
    expect(text).not.toMatch(/- Old LFGB certificate/);
    expect(text).toContain("Not used — expired: Old LFGB certificate, expired 2025-03-01");
  });

  it("is evidence the claim screen recognises", () => {
    const withDoc = scanClaims("BPA-free silicone cup", evidenceText([doc()], today));
    const without = scanClaims("BPA-free silicone cup", "");
    const status = (hits: typeof withDoc) => hits.find((h) => h.rule.id === "bpa_free")?.status;
    expect(status(without)).toBe("unverified");
    expect(status(withDoc)).toBe("verified");
  });

  it("never exceeds the input limit", () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      doc({ id: `evd_${i}`, notes: "x".repeat(200) }),
    );
    const text = evidenceText(many, today);
    expect(text.length).toBeLessThanOrEqual(4000);
    expect(text).toMatch(/more document\(s\) left out/);
  });

  it("returns nothing for no documents and merges with typed evidence", () => {
    expect(evidenceText([], today)).toBe("");
    expect(mergeEvidence("SGS report no. 1", "")).toBe("SGS report no. 1");
    expect(mergeEvidence("", "- doc")).toBe("- doc");
    expect(mergeEvidence("typed", "- doc")).toBe("typed\n\n- doc");
  });
});
