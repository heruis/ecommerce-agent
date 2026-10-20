import { ChevronDown } from "lucide-react";

/** Accordion built on <details>, so it works without JavaScript. Owner: WS3. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 list-none items-center justify-between gap-4 px-5 py-4 font-semibold transition-colors duration-200 hover:bg-subtle/60 [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown
              aria-hidden
              className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="px-5 pb-5 text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
