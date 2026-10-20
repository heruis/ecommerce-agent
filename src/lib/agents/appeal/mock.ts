import type { AppealInput, ExplanationLanguage, PolicyRef } from "@/lib/contracts";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";
import { toolResultsSoFar, type MockResponder } from "@/lib/harness";

/**
 * Offline stand-in for the appeal agent (AI_MODE=mock):
 *   turn 1 -> search_policy for the notice's topic
 *   turn 2 -> submit_appeal_analysis built from templates + what the search returned
 */
export interface AppealTopic {
  id: "pesticide" | "fda" | "origin" | "trademark" | "general";
  re: RegExp;
  query: string;
  area: Record<ExplanationLanguage, string>;
  documents: Record<ExplanationLanguage, string[]>;
  replacement: string;
}

export const APPEAL_TOPICS: AppealTopic[] = [
  {
    id: "pesticide",
    re: /antibacterial|antimicrobial|anti-?bacterial|kills?\s+(?:\d+(?:\.\d+)?%\s+of\s+)?(?:germs|bacteria|viruses|mold)|pesticid|FIFRA|\bEPA\b|抗菌|杀菌|除螨|防霉/i,
    query: "antibacterial antimicrobial pesticide claim EPA",
    area: {
      en: "Pesticide and antimicrobial claims (US EPA, FIFRA)",
      zh: "农药/抗菌宣称（美国环保署 EPA，FIFRA 法规）",
    },
    documents: {
      en: ["EPA registration number for the treated material, only if you want to keep the claim"],
      zh: ["如需保留抗菌宣称，需要提供处理材料的 EPA 注册号；否则直接删除该宣称即可"],
    },
    replacement: "easy to clean",
  },
  {
    id: "fda",
    re: /\bFDA\b|medical|cure|treat|drug|医疗|治疗|药/i,
    query: "FDA approved claim food contact",
    area: {
      en: "FDA approval and medical claims",
      zh: "FDA 认证与医疗功效宣称",
    },
    documents: {
      en: [
        "A food-contact test report (e.g. FDA 21 CFR or LFGB) if you describe the material as food-grade",
      ],
      zh: ["如果写“食品级材质”，准备一份食品接触检测报告（如 FDA 21 CFR 或 LFGB）"],
    },
    replacement: "made with food-grade silicone",
  },
  {
    id: "origin",
    re: /made in (?:the )?u\.?s\.?a?\.?|made in america|country of origin|美国制造|原产地/i,
    query: "Made in USA claim origin",
    area: {
      en: "Country-of-origin claims (FTC Made in USA)",
      zh: "原产地宣称（美国联邦贸易委员会“美国制造”规则）",
    },
    documents: {
      en: [
        "Supplier and manufacturing records only if the product is truly all or virtually all made in the US",
      ],
      zh: ["只有产品确实“全部或几乎全部”在美国生产时，才需要供应商和生产记录；否则改为真实产地"],
    },
    replacement: "designed in the USA",
  },
  {
    id: "trademark",
    re: /trademark|intellectual property|counterfeit|infring|brand name|商标|侵权|假冒|品牌/i,
    query: "brand names trademark other companies listing",
    area: {
      en: "Trademark and brand-name use (intellectual property)",
      zh: "商标与他人品牌名称的使用（知识产权）",
    },
    documents: {
      en: ["Proof that you own the brand or are authorized to sell it, if you dispute the notice"],
      zh: ["如对通知有异议，需提供品牌所有权或授权销售证明"],
    },
    replacement: "compatible with",
  },
];

const GENERAL: AppealTopic = {
  id: "general",
  re: /.^/,
  query: "restricted product claims listing policy",
  area: { en: "Listing content policy", zh: "商品信息内容政策" },
  documents: { en: [], zh: [] },
  replacement: "",
};

export function classifyNotice(text: string): AppealTopic {
  return APPEAL_TOPICS.find((t) => t.re.test(text)) ?? GENERAL;
}

/** The phrase in the listing (or notice) that most likely triggered the notice. */
export function triggerPhrase(input: AppealInput, topic: AppealTopic): string {
  const listingHit = scanClaims(input.listing_text).find((h) => h.language === "en");
  if (listingHit) return listingHit.match;
  const m = (input.listing_text || input.notice).match(topic.re);
  return m?.[0] ?? "";
}

export function appealMock(input: AppealInput, language: ExplanationLanguage): MockResponder {
  const topic = classifyNotice(`${input.notice}\n${input.listing_text}`);
  return (req) => {
    if (toolResultsSoFar(req).length === 0) {
      return {
        text: "Looking up the policy behind this notice.",
        toolCalls: [{ name: "search_policy", input: { query: topic.query } }],
      };
    }
    return {
      text: "Submitting the analysis.",
      toolCalls: [
        { name: "submit_appeal_analysis", input: mockAnalysis(input, language, topic, req) },
      ],
    };
  };
}

function mockAnalysis(
  input: AppealInput,
  language: ExplanationLanguage,
  topic: AppealTopic,
  req: Parameters<MockResponder>[0],
) {
  const refs: PolicyRef[] = [];
  for (const block of toolResultsSoFar(req)) {
    const text =
      typeof block.content === "string"
        ? block.content
        : (block.content ?? []).map((c) => (c.type === "text" ? c.text : "")).join("");
    const parsed = safeJson(text) as { results?: PolicyRef[] } | null;
    for (const r of parsed?.results?.slice(0, 2) ?? []) {
      refs.push({ doc_id: r.doc_id, chunk_id: r.chunk_id, title: r.title, url: r.url });
    }
  }
  const phrase = triggerPhrase(input, topic);
  const zh = language === "zh";
  const quoted = phrase ? `"${phrase}"` : zh ? "通知中提到的宣称" : "the claim named in the notice";
  const changes =
    phrase && input.listing_text.toLowerCase().includes(phrase.toLowerCase())
      ? [
          {
            field: "listing",
            before: phrase,
            after: topic.replacement && topic.id !== "trademark" ? topic.replacement : "",
          },
        ]
      : [];
  return {
    policy_area: topic.area[language],
    what_happened: zh
      ? `平台认为您的商品信息违反了“${topic.area.zh}”相关规定，因此限制或下架了该商品。`
      : `The marketplace believes the listing breaks its rules on ${topic.area.en.toLowerCase()}, so it limited or removed the listing.`,
    likely_cause: zh
      ? `最可能的原因是商品信息中的 ${quoted}。`
      : `Most likely the wording ${quoted} in the listing.`,
    severity: topic.id === "general" ? "medium" : "high",
    fix_steps: zh
      ? [
          `删除或改写 ${quoted}，只保留能证明的客观事实。`,
          "检查标题、五点描述、商品描述和后台搜索词中是否还有同类说法。",
          "修改保存后，再提交下方的申诉说明（行动计划）。",
        ]
      : [
          `Remove or reword ${quoted} so the listing states only facts you can prove.`,
          "Check the title, bullets, description and search terms for the same kind of wording.",
          "Save the listing, then submit the appeal (Plan of Action) below.",
        ],
    documents_needed: topic.documents[language],
    listing_changes: changes,
    appeal_text:
      `Dear ${input.platform === "tiktok_us" ? "TikTok Shop" : "Seller Performance"} team,\n\n` +
      `Root cause: our listing used the wording ${phrase ? `"${phrase}"` : "named in your notice"}, which we could not support under your ${topic.area.en.split(" (")[0].toLowerCase()} policy.\n\n` +
      "Corrective action: we removed that wording from the title, bullet points, description and search terms, and now describe only verifiable product facts.\n\n" +
      "Preventive measures: every new listing is checked against your restricted-claims policy before publishing, and claims are only used when we hold supporting documents.\n\n" +
      "We respectfully ask you to review and reinstate the listing.\n\nThank you.",
    policy_refs: refs,
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
