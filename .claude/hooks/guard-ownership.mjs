#!/usr/bin/env node
// PreToolUse(Edit|Write|...): block edits outside your workstream's folders.
// This is the "collision avoidance" guardrail for agent teams (course Module 4):
// five people run Claude Code in parallel, and no agent may edit another
// workstream's files. The branch name decides the workstream (ws1/..., ws2/...).
// Disable for one session with LISTWISE_OWNERSHIP=off (then explain why in your PR).
import { execSync } from "node:child_process";
import path from "node:path";
import { block, readHookInput } from "./read-input.mjs";

if (process.env.LISTWISE_OWNERSHIP === "off") process.exit(0);

const input = await readHookInput();
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);

const cwd = input.cwd || process.cwd();
let root;
let branch;
try {
  root = execSync("git rev-parse --show-toplevel", { cwd, encoding: "utf8" }).trim();
  branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf8" }).trim();
} catch {
  process.exit(0); // not a git checkout: nothing to enforce
}

const rel = path.relative(root, path.resolve(cwd, target)).split(path.sep).join("/");
if (rel.startsWith("..")) process.exit(0); // outside the repo (e.g. scratch files)

const lib = await import(path.join(root, "scripts", "ownership-lib.mjs"));
const ownership = lib.loadOwnership(root);
const ws = lib.workstreamForBranch(ownership, branch);
if (lib.canEdit(ownership, ws, rel)) process.exit(0);

const owners = lib.ownersOf(ownership, rel);
block(
  `Blocked by ownership guard: "${rel}" is outside ${ws.name} (branch "${branch}").\n` +
    `Owner: ${owners.length ? owners.join(", ") : "lead (main)"}.\n` +
    "Do not work around this. Either make the change inside your own folders, or write the request in " +
    `docs/team/status/${ws.id}.md under "Requests for other workstreams" so the owner or lead can make it.`,
);
