import {
  SellerExplanation,
  type ClaimAssessment,
  type ComplianceReport,
  type ExplanationLanguage,
  type ListingDraft,
  type RiskScore,
} from "@/lib/contracts";
import { structuredCall, type AgentContext } from "@/lib/harness";
import { platformLabel } from "@/lib/rules";
import type { Platform } from "@/lib/contracts";
import { explainSystem } from "./prompt";

export interface ExplainInput {
  platform: Platform;
  listing: ListingDraft;
  compliance: ComplianceReport;
  risk: RiskScore;
  needsReview: string[];
  language: ExplanationLanguage;
}

/**
 * Seller-language explanation (fast tier, single structured call): summary,
 * back-translation and one note per reviewed claim. Code keeps the shape
 * honest: one note per claim in report order, one translated bullet per bullet.
 */
export async function runExplain(
  ctx: AgentContext,
  input: ExplainInput,
): Promise<SellerExplanation> {
  const claims = input.compliance.claims;
  const user = [
    `Explain this ${platformLabel(input.platform)} listing to the seller.`,
    `<listing>\n${JSON.stringify(
      {
        title: input.listing.title,
        bullets: input.listing.bullets,
        description: input.listing.description,
      },
      null,
      2,
    )}\n</listing>`,
    `Takedown risk: ${input.risk.level} (${input.risk.score}/100). Reasons: ${input.risk.reasons.join(" | ")}`,
    `Items the seller must confirm: ${input.needsReview.join(" | ") || "(none)"}`,
    `<claims>\n${
      claims
        .map((c) => `${c.id}: "${c.claim_text}" — ${c.status}, action ${c.action}. ${c.reason}`)
        .join("\n") || "(no claims were reviewed)"
    }\n</claims>`,
  ].join("\n\n");

  const raw = await structuredCall(ctx, {
    agent: "explain",
    tier: "fast",
    effort: "low",
    system: explainSystem(input.language),
    user,
    schema: SellerExplanation,
    mock: () => ({ json: mockExplanation(input) }),
  });
  return alignExplanation(raw, input);
}

/** One note per claim in report order and one translated bullet per bullet. */
export function alignExplanation(raw: SellerExplanation, input: ExplainInput): SellerExplanation {
  const notes = new Map(raw.claim_notes.map((n) => [n.claim_id, n.note]));
  const bullets = input.listing.bullets.map((b, i) => raw.back_translation.bullets[i] ?? b);
  return {
    language: input.language,
    summary: raw.summary,
    back_translation: { ...raw.back_translation, bullets },
    claim_notes: input.compliance.claims.map((c) => ({
      claim_id: c.id,
      note: notes.get(c.id) ?? fallbackNote(c, input.language),
    })),
  };
}

function fallbackNote(c: ClaimAssessment, language: ExplanationLanguage): string {
  if (language === "zh") {
    if (c.status === "restricted")
      return `“${c.claim_text}”属于平台限制的宣称，可能导致商品被下架，请删除或改写。`;
    if (c.status === "unverified")
      return `“${c.claim_text}”需要检测报告或证书支持；没有证明前请不要使用。`;
    return `“${c.claim_text}”已有证据支持，可以保留，请保存好相关文件。`;
  }
  if (c.status === "restricted")
    return `"${c.claim_text}" is a restricted claim that can get the listing removed. Remove or reword it.`;
  if (c.status === "unverified")
    return `"${c.claim_text}" needs a test report or certificate. Do not use it until you have one.`;
  return `"${c.claim_text}" is supported by your evidence. Keep the document on file.`;
}

/** Offline stand-in: templated summary and notes; the listing is not machine-translated. */
export function mockExplanation(input: ExplainInput): SellerExplanation {
  const zh = input.language === "zh";
  const level = { low: zh ? "低" : "low", medium: zh ? "中" : "medium", high: zh ? "高" : "high" }[
    input.risk.level
  ];
  const tag = zh ? "[模拟模式：未翻译] " : "[mock mode] ";
  const summary = zh
    ? `这份${platformLabel(input.platform)}商品信息的下架风险为“${level}”（${input.risk.score}/100）。${
        input.needsReview.length
          ? `发布前请先确认 ${input.needsReview.length} 项内容。`
          : "目前没有需要您确认的事项。"
      }真实模式下这里会提供完整的中文回译。`
    : `This ${platformLabel(input.platform)} listing has ${level} takedown risk (${input.risk.score}/100). ${
        input.needsReview.length
          ? `Confirm ${input.needsReview.length} item(s) before publishing.`
          : "Nothing needs your confirmation."
      }`;
  return {
    language: input.language,
    summary,
    back_translation: {
      title: tag + input.listing.title,
      bullets: input.listing.bullets.map((b) => tag + b),
      description: tag + input.listing.description,
    },
    claim_notes: input.compliance.claims.map((c) => ({
      claim_id: c.id,
      note: fallbackNote(c, input.language),
    })),
  };
}
