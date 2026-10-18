#!/usr/bin/env node
// CI guard: fail a PR from a workstream branch if it edits files that branch does not own.
// Usage: node scripts/check-ownership.mjs [--base origin/main] [--branch ws1/foo]
import { execSync } from "node:child_process";
import { canEdit, loadOwnership, ownersOf, workstreamForBranch } from "./ownership-lib.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const sh = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();
const branch = arg(
  "--branch",
  process.env.GITHUB_HEAD_REF || sh("git rev-parse --abbrev-ref HEAD"),
);
const base = arg(
  "--base",
  process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main",
);

const ownership = loadOwnership();
const ws = workstreamForBranch(ownership, branch);
if (ws.id === "lead") {
  console.log(`Branch "${branch}" is a lead/integration branch: no ownership restrictions.`);
  process.exit(0);
}

const changed = sh(`git diff --name-only ${base}...HEAD`).split("\n").filter(Boolean);
const violations = changed.filter((f) => !canEdit(ownership, ws, f));

console.log(`Branch "${branch}" → ${ws.name}. ${changed.length} changed file(s).`);
if (violations.length === 0) {
  console.log("✓ All changes are inside this workstream's area.");
  process.exit(0);
}
console.error("\n✕ These files belong to another workstream:");
for (const f of violations) {
  const owners = ownersOf(ownership, f);
  console.error(`  - ${f}  (owner: ${owners.length ? owners.join(", ") : "lead"})`);
}
console.error(
  "\nMove these changes to a separate contract/* or chore/* PR to main, or ask the owner to make them." +
    "\nSee docs/team/TEAM_GUIDE.md → 'Changing a file you do not own'.",
);
process.exit(1);
