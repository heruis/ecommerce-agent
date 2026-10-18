/**
 * Guardrails in three layers (course Module 4, "Guardrails in production"):
 *   Layer 1 input   — input.ts  (injection screen, prohibited products, PII redaction)
 *   Layer 2 actions — tool caps, budgets and auth live in the harness and tools
 *   Layer 3 output  — gate.ts   (policy gate, deterministic claim sweep, re-validation)
 */
export {
  CLAIM_RULES,
  scanClaims,
  stripPhrase,
  type ClaimRule,
  type LexiconHit,
} from "./claims-lexicon";
export { applyGate, replaceCaseAware, type GateResult } from "./gate";
export { asSellerData, screenInput, type InputScreenResult } from "./input";
export { redactForLog, redactPII, type PiiFinding } from "./pii";
