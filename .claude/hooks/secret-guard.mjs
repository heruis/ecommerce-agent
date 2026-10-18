#!/usr/bin/env node
// UserPromptSubmit: stop API keys from being pasted into the chat, where they
// would be sent to the model and kept in transcripts. Put them in .env.local.
import { block, readHookInput } from "./read-input.mjs";

const input = await readHookInput();
const prompt = String(input.prompt ?? "");
const patterns = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "Anthropic API key"],
  [/\bsk_(?:live|test)_[A-Za-z0-9]{16,}/, "Stripe secret key"],
  [/\brk_(?:live|test)_[A-Za-z0-9]{16,}/, "Stripe restricted key"],
  [/\bwhsec_[A-Za-z0-9]{16,}/, "Stripe webhook secret"],
  [/\bsb_secret_[A-Za-z0-9_-]{16,}/, "Supabase secret key"],
  [/\bpa-[A-Za-z0-9_-]{30,}/, "Voyage API key"],
  [
    /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    "JWT (possibly a Supabase service_role key)",
  ],
];
const hit = patterns.find(([re]) => re.test(prompt));
if (hit) {
  block(
    `Your message looks like it contains a ${hit[1]}. It was NOT sent.\n` +
      "Put secrets in .env.local (never in chat, code or commits), then run `pnpm check:env`.\n" +
      "If this key was already shared anywhere, rotate it in the provider's dashboard.",
  );
}
process.exit(0);
