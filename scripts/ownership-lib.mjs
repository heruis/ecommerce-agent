// Shared by the Claude Code hook and the CI check. Dependency-free on purpose
// so the hook works even before `pnpm install`.
import fs from "node:fs";
import path from "node:path";

/** Convert a glob (supports **, *, ?) to a RegExp anchored to the whole path. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // "**/" matches zero or more directories; a trailing "**" matches anything
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(file, globs = []) {
  return globs.some((g) => globToRegExp(g).test(file));
}

export function loadOwnership(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, "ownership.json"), "utf8"));
}

/** Which workstream a branch belongs to. Unknown branches are treated as lead (not restricted). */
export function workstreamForBranch(ownership, branch) {
  for (const [id, ws] of Object.entries(ownership.workstreams)) {
    if (id === "lead") continue;
    if (ws.branch_prefixes.some((p) => branch.startsWith(p))) return { id, ...ws };
  }
  return { id: "lead", ...ownership.workstreams.lead };
}

/** May this workstream edit this repo-relative file? */
export function canEdit(ownership, ws, file) {
  const f = file.replace(/\\/g, "/").replace(/^\.\//, "");
  if (ws.id === "lead") return true;
  if (matchesAny(f, ws.except)) return false;
  return matchesAny(f, ws.owns) || matchesAny(f, ownership.shared);
}

/** Owners of a file, for helpful error messages. */
export function ownersOf(ownership, file) {
  return Object.entries(ownership.workstreams)
    .filter(
      ([id, ws]) => id !== "lead" && matchesAny(file, ws.owns) && !matchesAny(file, ws.except),
    )
    .map(([id, ws]) => `${id} (${ws.name})`);
}
