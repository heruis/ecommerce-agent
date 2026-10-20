"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ToolKind } from "@/lib/contracts";
import type { ToolStreamEvent } from "@/lib/pipeline/tool-run";

export interface ToolStreamError {
  message: string;
  code: string;
  fields?: Record<string, string>;
}

/**
 * Start an audit or appeal: POST the form, read the server-sent progress
 * events, then open the saved result. Owner: WS3.
 */
export function useToolStream(kind: ToolKind) {
  const router = useRouter();
  const [events, setEvents] = useState<ToolStreamEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<ToolStreamError | null>(null);

  async function start(body: unknown) {
    setRunning(true);
    setError(null);
    setEvents([]);
    let res: Response;
    try {
      res = await fetch(`/api/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setError({ message: "", code: "network" });
      setRunning(false);
      return;
    }
    if (!res.ok || !res.body) {
      const b = await res.json().catch(() => null);
      setError({
        message: b?.error?.message ?? "",
        code: b?.error?.code ?? "error",
        fields: b?.error?.fields
          ? Object.fromEntries(
              (b.error.fields as { path: string; message: string }[]).map((f) => [
                f.path.split(".")[0],
                f.message,
              ]),
            )
          : undefined,
      });
      setRunning(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneId: string | null = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6)) as ToolStreamEvent;
        setEvents((prev) => [...prev, event]);
        if (event.type === "tool_completed") doneId = event.id;
        if (event.type === "tool_failed") {
          setError({ message: event.error, code: event.code });
        }
      }
    }
    setRunning(false);
    if (doneId) router.push(`/${kind}/${doneId}`);
    router.refresh();
  }

  return { events, running, error, start };
}
