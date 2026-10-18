import type { ClaimAssessment } from "@/lib/contracts";

/**
 * Deterministic lexicon of risky marketing claims (English + Chinese).
 *
 * The compliance agent does the semantic work; this lexicon is the safety net
 * that runs in code on every final listing, so a restricted phrase cannot slip
 * through even if the model misses it. It is a risk screen, not legal advice:
 * the same word can be fine or risky depending on platform, category and
 * evidence, which is why most entries depend on `evidence_hint`.
 *
 * Owner: WS2 (trust layer). Add entries with a test in claims-lexicon.test.ts.
 */
export interface ClaimRule {
  id: string;
  claim_type:
    | "certification"
    | "safety"
    | "ranking"
    | "health"
    | "environmental"
    | "origin"
    | "comparative"
    | "other";
  en: RegExp;
  zh: RegExp;
  /** Status when no supporting evidence is found. */
  default_status: ClaimAssessment["status"];
  risk: ClaimAssessment["risk"];
  /** If the seller's evidence matches this, the claim may be supportable. */
  evidence_hint?: RegExp;
  /** Status when evidence_hint matches. */
  with_evidence_status?: ClaimAssessment["status"];
  /** Knowledge-base docs that explain the rule (knowledge/policies/<id>.md). */
  policy_docs: string[];
  guidance: string;
}

export const CLAIM_RULES: ClaimRule[] = [
  {
    id: "fda_approval",
    claim_type: "certification",
    en: /\bFDA[- ]?(?:approved|certified|registered|cleared)\b|\bapproved by (?:the )?FDA\b/i,
    zh: /FDA(?:认证|批准|注册|认可)/,
    default_status: "restricted",
    risk: "high",
    policy_docs: ["fda-approval-claims"],
    guidance:
      "FDA does not approve or certify food-contact products like cups. Describe the material instead, e.g. 'made with food-grade silicone', and only cite FDA regulations with a test report.",
  },
  {
    id: "absolute_safety",
    claim_type: "safety",
    en: /\b(?:100%|completely|totally|absolutely|perfectly)\s+safe\b|\bzero risk\b|\brisk[- ]free\b/i,
    zh: /100%\s*安全|百分百安全|绝对安全|完全安全|零风险|完全无害/,
    default_status: "restricted",
    risk: "high",
    policy_docs: ["ftc-substantiation", "amazon-prohibited-claims"],
    guidance:
      "Absolute safety promises cannot be substantiated. Replace with specific, testable material facts.",
  },
  {
    id: "ranking_number_one",
    claim_type: "ranking",
    en: /#\s?1\b|\bnumber one\b|\bno\.\s?1\b|\bbest[- ]sell(?:ing|er)\b|\btop[- ]sell(?:ing|er)\b/i,
    zh: /销量第一|排名第一|全网第一|销冠|全美第一|美国第一|第一名/,
    default_status: "restricted",
    risk: "high",
    policy_docs: ["comparative-superlative-claims", "amazon-title-requirements"],
    guidance:
      "Sales-rank claims need current, verifiable data and are not allowed in Amazon titles. Remove them.",
  },
  {
    id: "superlative",
    claim_type: "comparative",
    en: /\b(?:the )?best\b|\bworld'?s (?:best|finest)\b|\bstrongest\b|\bhighest quality\b/i,
    zh: /最好|最佳|第一品牌|顶级|最强/,
    default_status: "unverified",
    risk: "medium",
    policy_docs: ["comparative-superlative-claims", "amazon-search-terms"],
    guidance:
      "Subjective superlatives add no information and can read as unsubstantiated comparisons. Use a concrete benefit.",
  },
  {
    id: "medical_claim",
    claim_type: "health",
    en: /\b(?:cures?|treats?|heals?|prevents? (?:disease|illness|cancer|infection)|therapeutic|anti-inflammatory|relieves? pain|detox(?:ify|ifies)?)\b/i,
    zh: /治疗|治愈|根治|预防疾病|消炎|止痛|排毒|抗癌|药用/,
    default_status: "restricted",
    risk: "high",
    policy_docs: ["amazon-prohibited-claims", "fda-approval-claims"],
    guidance:
      "Disease or treatment claims turn a consumer product into a drug or device. Remove them.",
  },
  {
    id: "antimicrobial",
    claim_type: "health",
    en: /\b(?:anti-?bacterial|anti-?microbial|germ[- ]killing|kills? (?:\d+(?:\.\d+)?% of )?(?:germs|bacteria|viruses)|disinfect(?:s|ing)?)\b/i,
    zh: /抗菌|杀菌|除菌|消毒|抑菌|灭菌/,
    default_status: "restricted",
    risk: "high",
    evidence_hint: /EPA/i,
    with_evidence_status: "unverified",
    policy_docs: ["epa-pesticide-claims"],
    guidance:
      "Germ-killing claims are pesticide claims in the US and need EPA registration. Remove unless registered.",
  },
  {
    id: "non_toxic",
    claim_type: "safety",
    en: /\bnon[- ]?toxic\b|\bchemical[- ]free\b|\btoxin[- ]free\b/i,
    zh: /无毒|无化学|零毒/,
    default_status: "unverified",
    risk: "medium",
    evidence_hint: /(?:SGS|LFGB|FDA|test report|检测报告|CPSIA|BPA)/i,
    with_evidence_status: "verified",
    policy_docs: ["ftc-substantiation"],
    guidance:
      "Vague safety words need test evidence. Prefer the specific tested fact, e.g. 'BPA-free (SGS tested)'.",
  },
  {
    id: "eco_general",
    claim_type: "environmental",
    en: /\beco[- ]?friendly\b|\benvironmentally friendly\b|\bgreen product\b|\bsustainable\b|\bplanet[- ]friendly\b/i,
    zh: /环保|绿色产品|可持续|对环境无害/,
    default_status: "unverified",
    risk: "medium",
    policy_docs: ["ftc-green-guides"],
    guidance:
      "Unqualified environmental claims are discouraged by the FTC Green Guides. Name the specific attribute (e.g. 'reusable').",
  },
  {
    id: "biodegradable",
    claim_type: "environmental",
    en: /\b(?:bio-?degradable|compostable)\b/i,
    zh: /可降解|可生物降解|可堆肥/,
    default_status: "restricted",
    risk: "high",
    evidence_hint: /(?:ASTM D6400|EN 13432|BPI|TÜV|OK compost)/i,
    with_evidence_status: "verified",
    policy_docs: ["ftc-green-guides"],
    guidance:
      "Degradability claims need competent evidence (e.g. ASTM D6400 certification). Remove without it.",
  },
  {
    id: "made_in_usa",
    claim_type: "origin",
    en: /\bmade in (?:the )?(?:usa|u\.s\.a\.|united states|america)\b/i,
    zh: /美国制造|美国生产/,
    default_status: "restricted",
    risk: "high",
    policy_docs: ["ftc-made-in-usa"],
    guidance: "'Made in USA' requires all or virtually all of the product to be made in the US.",
  },
  {
    id: "bpa_free",
    claim_type: "safety",
    en: /\bBPA[- ]free\b/i,
    zh: /不含BPA|无BPA|BPA\s*free/i,
    default_status: "unverified",
    risk: "low",
    evidence_hint: /(?:BPA|SGS|LFGB|FDA|test report|检测报告)/i,
    with_evidence_status: "verified",
    policy_docs: ["ftc-substantiation"],
    guidance: "Fine to state when a test report backs it; otherwise ask the seller for evidence.",
  },
  {
    id: "promo_guarantee",
    claim_type: "other",
    en: /\b(?:lifetime warranty|money[- ]back guarantee|100% satisfaction|free shipping|on sale|discount|coupon)\b/i,
    zh: /终身保修|无理由退款|包邮|打折|优惠券|特价/,
    default_status: "restricted",
    risk: "medium",
    policy_docs: ["amazon-title-requirements", "amazon-detail-page-content"],
    guidance: "Promotions, shipping and guarantee language does not belong in listing copy.",
  },
];

export interface LexiconHit {
  rule: ClaimRule;
  match: string;
  language: "en" | "zh";
  status: ClaimAssessment["status"];
}

/** Find risky claims in text. `evidence` is the seller's evidence field. */
export function scanClaims(text: string, evidence = ""): LexiconHit[] {
  const hits: LexiconHit[] = [];
  for (const rule of CLAIM_RULES) {
    const supported = rule.evidence_hint ? rule.evidence_hint.test(evidence) : false;
    const status =
      supported && rule.with_evidence_status ? rule.with_evidence_status : rule.default_status;
    for (const [language, re] of [
      ["en", rule.en],
      ["zh", rule.zh],
    ] as const) {
      const m = text.match(re);
      if (m) hits.push({ rule, match: m[0], language, status });
    }
  }
  return hits;
}

/** Remove a phrase and tidy up the punctuation it leaves behind. */
export function stripPhrase(text: string, phrase: string): string {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(escaped, "gi"), "")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .replace(/([,;:])\s*([,;:.])/g, "$2")
    .replace(/\(\s*\)/g, "")
    .replace(/^\s*[,;:–-]\s*/, "")
    .replace(/\s*[,;:–-]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
