import { z } from "zod";

/**
 * Typed, validated server environment. Import `env()` instead of reading
 * process.env directly so a missing key fails loudly with a clear message.
 */
const EnvSchema = z.object({
  AI_MODE: z.enum(["mock", "live"]).default("mock"),
  DATA_MODE: z.enum(["memory", "supabase"]).default("memory"),
  BILLING_MODE: z.enum(["mock", "stripe"]).default("mock"),
  RAG_MODE: z.enum(["lexical", "vector"]).default("lexical"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_SMART: z.string().optional(),
  ANTHROPIC_MODEL_FAST: z.string().optional(),
  PRICE_SMART_INPUT_PER_MTOK: z.coerce.number().default(2),
  PRICE_SMART_OUTPUT_PER_MTOK: z.coerce.number().default(10),
  PRICE_FAST_INPUT_PER_MTOK: z.coerce.number().default(0.1),
  PRICE_FAST_OUTPUT_PER_MTOK: z.coerce.number().default(0.5),

  VOYAGE_API_KEY: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),

  FREE_RUNS: z.coerce.number().int().min(0).default(3),
  PRO_RUNS_PER_PERIOD: z.coerce.number().int().min(1).default(50),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  // Treat empty strings from .env files as "not set".
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** Throws a helpful error when a live mode is on but its keys are missing. */
export function requireEnv<K extends keyof Env>(key: K, why: string): NonNullable<Env[K]> {
  const value = env()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing ${String(key)} (${why}). See docs/SETUP.md.`);
  }
  return value as NonNullable<Env[K]>;
}

/** Test helper: forget the cached env after mutating process.env. */
export function resetEnvCache() {
  cached = null;
}
