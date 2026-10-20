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
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  /** Set automatically by Vercel (host name only, no https://). */
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL_SMART: z.string().optional(),
  ANTHROPIC_MODEL_FAST: z.string().optional(),
  // Conservative defaults so the per-run cost cap errs on the safe side;
  // set the real prices for your models from the Anthropic pricing page.
  PRICE_SMART_INPUT_PER_MTOK: z.coerce.number().default(3),
  PRICE_SMART_OUTPUT_PER_MTOK: z.coerce.number().default(15),
  PRICE_FAST_INPUT_PER_MTOK: z.coerce.number().default(1),
  PRICE_FAST_OUTPUT_PER_MTOK: z.coerce.number().default(5),

  VOYAGE_API_KEY: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),

  FREE_RUNS: z.coerce.number().int().min(0).default(3),
  PRO_RUNS_PER_PERIOD: z.coerce.number().int().min(1).default(50),
  PACK_CREDITS: z.coerce.number().int().min(1).default(20),
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

/** Public base URL for redirects (Stripe, auth emails). No trailing slash. */
export function appUrl(): string {
  const e = env();
  if (e.NEXT_PUBLIC_APP_URL) return e.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  if (e.VERCEL_PROJECT_PRODUCTION_URL) return `https://${e.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Test helper: forget the cached env after mutating process.env. */
export function resetEnvCache() {
  cached = null;
}
