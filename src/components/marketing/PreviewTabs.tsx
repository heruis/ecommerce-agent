"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * Accessible tabs (WAI-ARIA tabs pattern: arrow keys, Home/End). Every panel is
 * rendered on the server and hidden with the `hidden` attribute, so content is
 * in the HTML and only visibility changes. Owner: WS3.
 */
export function PreviewTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: { id: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : e.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="mb-6 flex flex-wrap justify-center gap-2 rounded-xl bg-subtle p-1.5 sm:inline-flex"
      >
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors duration-200",
                selected
                  ? "bg-surface text-brand shadow-sm"
                  : "text-muted hover:bg-surface/60 hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          data-preview={t.id}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
