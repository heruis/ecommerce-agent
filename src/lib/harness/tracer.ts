import type { Span, SpanKind } from "@/lib/contracts";
import { newId, nowIso } from "@/lib/utils/ids";

type Attr = string | number | boolean | null;

const MAX_LOGGED_CHARS = 4000;

/**
 * Collects spans for one run. Every stage, LLM call, tool call and guardrail
 * check becomes a span with input, output, timing and attributes, so a failed
 * run can be debugged from the trace page and good runs become eval cases.
 *
 * Inputs and outputs pass through `redact` (PII scrubbing) and are truncated
 * before they are stored: logs keep references, not raw personal data.
 */
export class Tracer {
  readonly spans: Span[] = [];
  private readonly starts = new Map<string, number>();

  constructor(private readonly redact: (text: string) => string = (t) => t) {}

  start(
    name: string,
    kind: SpanKind,
    parentId: string | null,
    input?: unknown,
    attrs: Record<string, Attr> = {},
  ): string {
    const id = newId("span");
    this.starts.set(id, Date.now());
    this.spans.push({
      id,
      parent_id: parentId,
      name,
      kind,
      started_at: nowIso(),
      ended_at: null,
      duration_ms: null,
      status: "running",
      input: input === undefined ? undefined : this.sanitize(input),
      attrs,
    });
    return id;
  }

  end(
    id: string,
    opts: { output?: unknown; attrs?: Record<string, Attr>; error?: string } = {},
  ): void {
    const span = this.spans.find((s) => s.id === id);
    if (!span) return;
    span.ended_at = nowIso();
    span.duration_ms = Date.now() - (this.starts.get(id) ?? Date.now());
    span.status = opts.error ? "error" : "ok";
    if (opts.output !== undefined) span.output = this.sanitize(opts.output);
    if (opts.error) span.error = opts.error;
    if (opts.attrs) span.attrs = { ...span.attrs, ...opts.attrs };
  }

  /** Run `fn` inside a span; records errors and rethrows them. */
  async span<T>(
    name: string,
    kind: SpanKind,
    parentId: string | null,
    input: unknown,
    fn: (spanId: string) => Promise<T>,
    summarize: (result: T) => unknown = (r) => r,
  ): Promise<T> {
    const id = this.start(name, kind, parentId, input);
    try {
      const result = await fn(id);
      this.end(id, { output: summarize(result) });
      return result;
    } catch (e) {
      this.end(id, { error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }

  private sanitize(value: unknown): unknown {
    const json = typeof value === "string" ? value : safeStringify(value);
    const redacted = this.redact(json);
    const clipped =
      redacted.length > MAX_LOGGED_CHARS
        ? `${redacted.slice(0, MAX_LOGGED_CHARS)}… [truncated]`
        : redacted;
    if (typeof value === "string") return clipped;
    try {
      return JSON.parse(clipped);
    } catch {
      return clipped;
    }
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
