import fs from "node:fs";
import path from "node:path";

/**
 * Loads knowledge/policies/*.md and splits each document into chunks at
 * `## ` headings (ingestion -> chunking, course Module 3). Source ids and
 * URLs stay attached to every chunk so answers can cite them.
 */
export interface PolicyDoc {
  id: string;
  title: string;
  source_name: string;
  source_url: string;
  platforms: string[];
  topics: string[];
  verified: boolean;
}

export interface PolicyChunk {
  doc_id: string;
  chunk_id: string;
  title: string;
  url: string;
  platforms: string[];
  topics: string[];
  text: string;
}

export const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge", "policies");

let cache: { docs: PolicyDoc[]; chunks: PolicyChunk[] } | null = null;

export function loadCorpus(dir = KNOWLEDGE_DIR): { docs: PolicyDoc[]; chunks: PolicyChunk[] } {
  if (cache && dir === KNOWLEDGE_DIR) return cache;
  // The knowledge dir is shipped via outputFileTracingIncludes (next.config.ts).
  const files = fs
    .readdirSync(/*turbopackIgnore: true*/ dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const docs: PolicyDoc[] = [];
  const chunks: PolicyChunk[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(/*turbopackIgnore: true*/ dir, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const doc: PolicyDoc = {
      id: String(meta.id ?? file.replace(/\.md$/, "")),
      title: String(meta.title ?? file),
      source_name: String(meta.source_name ?? ""),
      source_url: String(meta.source_url ?? ""),
      platforms: asList(meta.platforms),
      topics: asList(meta.topics),
      verified: meta.verified === "true",
    };
    docs.push(doc);
    const sections = body.split(/^## /m).slice(1);
    sections.forEach((section, i) => {
      const [heading, ...rest] = section.split("\n");
      chunks.push({
        doc_id: doc.id,
        chunk_id: `${doc.id}#${i + 1}`,
        title: `${doc.title} — ${heading.trim()}`,
        url: doc.source_url,
        platforms: doc.platforms,
        topics: doc.topics,
        text: rest.join("\n").trim(),
      });
    });
  }
  const result = { docs, chunks };
  if (dir === KNOWLEDGE_DIR) cache = result;
  return result;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line
      .slice(idx + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: m[2] };
}

function asList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
