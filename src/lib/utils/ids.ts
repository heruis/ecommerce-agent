import { randomUUID } from "node:crypto";

/** Short prefixed ids for runs, spans and listings: "run_3f9a1c2b". */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
