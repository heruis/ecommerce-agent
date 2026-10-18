#!/usr/bin/env node
// PreToolUse(Bash): never print local secrets into the conversation.
// Permissions already deny Read(.env.local); this closes the `cat .env.local` side door.
import { block, readHookInput } from "./read-input.mjs";

const input = await readHookInput();
const cmd = String(input.tool_input?.command ?? "");
const readsEnv =
  /\.env(?:\.local|\.production|\.development)?\b/.test(cmd) && !/\.env\.example\b/.test(cmd);
const printer = /\b(cat|less|more|head|tail|grep|rg|sed|awk|printenv|env|echo|type|bat)\b/.test(
  cmd,
);
if (readsEnv && printer) {
  block(
    "Blocked: this command would print local secrets (.env*). Use `pnpm check:env` to verify configuration instead.",
  );
}
if (/\bprintenv\b|^\s*env\s*$/.test(cmd)) {
  block(
    "Blocked: printing the whole environment can leak API keys. Check a single non-secret variable instead.",
  );
}
process.exit(0);
