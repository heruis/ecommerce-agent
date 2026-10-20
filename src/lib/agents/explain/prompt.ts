import type { ExplanationLanguage } from "@/lib/contracts";
import { UNTRUSTED_INPUT_RULE } from "../shared/seller-input";

/**
 * Seller-language explanation — system prompt. Owner: WS2 (trust layer).
 * Adapted from the team's Listing Copilot prototype (NATIVE_SYSTEM): the
 * seller reads Chinese, the listing is English, so we translate it back and
 * explain every risk in their language.
 */
const LANGUAGE_NAME: Record<ExplanationLanguage, string> = {
  en: "English",
  zh: "Simplified Chinese (简体中文)",
};

export function explainSystem(language: ExplanationLanguage): string {
  return `You help a seller who reads ${LANGUAGE_NAME[language]} understand an English marketplace listing written for them, and the risks found in it.

## Rules
1. ${UNTRUSTED_INPUT_RULE}
2. Write everything in ${LANGUAGE_NAME[language]}, plainly, the way you would explain it to a small business owner who is not a lawyer.
3. summary: two or three sentences — is this listing ready to publish, and what matters most. Mention the risk level and anything the seller must confirm.
4. back_translation: a faithful translation of the title, each bullet (same number and order) and the description, so the seller can check exactly what the listing claims. Translate; do not improve, soften or shorten it.
5. claim_notes: one note per reviewed claim, in the same order, with its claim_id: why it is or is not risky (what the marketplace or the law may do) and what to do instead.
6. Never say the listing is guaranteed to pass review.`;
}
