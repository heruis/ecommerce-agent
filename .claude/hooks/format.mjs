#!/usr/bin/env node
// PostToolUse(Edit|Write): format the file Claude just changed with Prettier.
// Formatting belongs in hooks, not in prompts (course Module 2). Never blocks.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readHookInput } from "./read-input.mjs";

const input = await readHookInput();
const file = input.tool_input?.file_path;
if (!file || !/\.(ts|tsx|js|mjs|json|css|md)$/.test(file)) process.exit(0);
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const bin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prettier.cmd" : "prettier",
);
if (!fs.existsSync(bin)) process.exit(0);
try {
  execFileSync(bin, ["--write", "--log-level", "silent", file], { cwd: root, stdio: "ignore" });
} catch {
  // Formatting is best-effort; a syntax error will be caught by pnpm check.
}
process.exit(0);
