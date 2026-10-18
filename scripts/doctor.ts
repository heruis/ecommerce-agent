/**
 * `pnpm check:env` — checks that your environment is set up for the modes you
 * turned on in .env.local, and tells you exactly what to fix. Safe to run
 * any time: it only reads, and the Claude check costs no tokens.
 * Owner: WS4. Each failure points to a section of docs/SETUP.md.
 */
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import Stripe from "stripe";
import { env } from "@/lib/env";

type Status = "ok" | "warn" | "fail";
const results: { status: Status; name: string; detail: string }[] = [];
const report = (status: Status, name: string, detail = "") =>
  results.push({ status, name, detail });

async function check(name: string, fn: () => Promise<string | void>, fix: string) {
  try {
    const detail = await fn();
    report("ok", name, detail ?? "");
  } catch (e) {
    report("fail", name, `${e instanceof Error ? e.message : String(e)}\n      → ${fix}`);
  }
}

async function main() {
  const major = Number(process.versions.node.split(".")[0]);
  report(
    major >= 22 ? "ok" : "fail",
    "Node.js",
    `v${process.versions.node}${major >= 22 ? "" : " — install Node 22 (SETUP.md §1)"}`,
  );
  report(
    fs.existsSync(".env.local") ? "ok" : "warn",
    ".env.local",
    fs.existsSync(".env.local") ? "" : "not found — run: cp .env.example .env.local",
  );

  let e;
  try {
    e = env();
  } catch (err) {
    report("fail", "Environment", String(err));
    return;
  }
  report(
    "ok",
    "Modes",
    `AI=${e.AI_MODE} DATA=${e.DATA_MODE} BILLING=${e.BILLING_MODE} RAG=${e.RAG_MODE}`,
  );

  if (e.AI_MODE === "live") {
    await check(
      "Claude API key + models",
      async () => {
        if (!e.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is empty");
        if (!e.ANTHROPIC_MODEL_SMART || !e.ANTHROPIC_MODEL_FAST)
          throw new Error("ANTHROPIC_MODEL_SMART / _FAST are empty");
        const client = new Anthropic({ apiKey: e.ANTHROPIC_API_KEY });
        const smart = await client.models.retrieve(e.ANTHROPIC_MODEL_SMART);
        const fast = await client.models.retrieve(e.ANTHROPIC_MODEL_FAST);
        return `smart=${smart.display_name}, fast=${fast.display_name}`;
      },
      "SETUP.md §4: create a key at console.anthropic.com and set both model IDs",
    );
  } else {
    report(
      "warn",
      "Claude API",
      "AI_MODE=mock — agents are simulated. Set AI_MODE=live when your key is ready.",
    );
  }

  if (e.DATA_MODE === "supabase") {
    await check(
      "Supabase connection + schema",
      async () => {
        if (
          !e.NEXT_PUBLIC_SUPABASE_URL ||
          !e.SUPABASE_SECRET_KEY ||
          !e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ) {
          throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY are required",
          );
        }
        const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
          auth: { persistSession: false },
        });
        const { count, error } = await admin
          .from("profiles")
          .select("*", { count: "exact", head: true });
        if (error) throw new Error(`profiles table: ${error.message} (did you run the migration?)`);
        const rpc = await admin.rpc("consume_credit", {
          p_user_id: "00000000-0000-0000-0000-000000000000",
        });
        if (rpc.error) throw new Error(`consume_credit(): ${rpc.error.message}`);
        return `${count ?? 0} profiles; credit function OK`;
      },
      "SETUP.md §3: create the project, copy the keys, run supabase/migrations/*.sql in the SQL editor",
    );
  } else {
    report(
      "warn",
      "Database",
      "DATA_MODE=memory — data resets on restart. Fine for local dev, not for deploys.",
    );
  }

  if (e.BILLING_MODE === "stripe") {
    await check(
      "Stripe test mode",
      async () => {
        if (!e.STRIPE_SECRET_KEY?.startsWith("sk_test_"))
          throw new Error("STRIPE_SECRET_KEY must be a test key (sk_test_...)");
        if (!e.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"))
          throw new Error("STRIPE_WEBHOOK_SECRET must start with whsec_");
        if (!e.STRIPE_PRICE_ID_PRO?.startsWith("price_"))
          throw new Error("STRIPE_PRICE_ID_PRO must start with price_");
        const price = await new Stripe(e.STRIPE_SECRET_KEY).prices.retrieve(e.STRIPE_PRICE_ID_PRO);
        if (price.recurring?.interval !== "month")
          throw new Error("The Pro price must be a monthly recurring price");
        return `Pro price ${(price.unit_amount ?? 0) / 100} ${price.currency.toUpperCase()}/month`;
      },
      "SETUP.md §5: create the product + monthly price in test mode, run `stripe listen` for the webhook secret",
    );
  } else {
    report("warn", "Payments", "BILLING_MODE=mock — checkout is simulated.");
  }

  if (e.RAG_MODE === "vector") {
    report(
      e.VOYAGE_API_KEY ? "ok" : "fail",
      "Embeddings key",
      e.VOYAGE_API_KEY ? "" : "VOYAGE_API_KEY is empty (SETUP.md §6)",
    );
  }

  if (e.AI_MODE === "live" && e.DATA_MODE === "memory") {
    report(
      "warn",
      "Combination",
      "Live AI with in-memory data works locally; deploys need DATA_MODE=supabase.",
    );
  }
}

main().then(() => {
  const icon = { ok: "✓", warn: "!", fail: "✕" };
  console.log("\nListWise doctor\n");
  for (const r of results)
    console.log(`${icon[r.status]} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  const failed = results.filter((r) => r.status === "fail").length;
  console.log(
    failed ? `\n${failed} problem(s) to fix. See docs/SETUP.md.` : "\nAll enabled modes look good.",
  );
  process.exitCode = failed ? 1 : 0;
});
