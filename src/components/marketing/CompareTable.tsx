import { Check, Minus, X } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/components/ui";

type Value = "yes" | "no" | "partial";

/**
 * ShelfPass vs the kinds of tools sellers use today. Values are keywords
 * rendered as icons + a text legend (meaning never relies on color alone).
 * On narrow screens each row becomes a card instead of scrolling sideways.
 * Owner: WS3.
 */
export function CompareTable({ t }: { t: Dictionary["marketing"]["compare"] }) {
  const cols = [t.columns.shelfpass, t.columns.chat, t.columns.builtIn, t.columns.keywords];
  return (
    <div className="space-y-4">
      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-subtle/60">
              <th scope="col" className="w-[34%] px-5 py-4" />
              {cols.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={cn(
                    "px-3 py-4 text-center font-semibold",
                    i === 0 ? "text-brand" : "text-muted",
                  )}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-0">
                <th scope="row" className="px-5 py-3.5 font-medium">
                  {row.label}
                </th>
                {row.values.map((v, i) => (
                  <td key={i} className={cn("px-3 py-3.5 text-center", i === 0 && "bg-brand/5")}>
                    <Mark value={v as Value} legend={t.legend} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <ul className="space-y-3 md:hidden">
        {t.rows.map((row) => (
          <li key={row.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-medium">{row.label}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {row.values.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Mark value={v as Value} legend={t.legend} />
                  <dt
                    className={cn("text-xs", i === 0 ? "font-semibold text-brand" : "text-muted")}
                  >
                    {cols[i]}
                  </dt>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
        {(["yes", "partial", "no"] as const).map((v) => (
          <li key={v} className="flex items-center gap-1.5">
            <Mark value={v} legend={t.legend} decorative />
            {t.legend[v]}
          </li>
        ))}
      </ul>
      <p className="mx-auto max-w-3xl text-center text-xs text-muted">{t.footnote}</p>
    </div>
  );
}

function Mark({
  value,
  legend,
  decorative = false,
}: {
  value: Value;
  legend: Dictionary["marketing"]["compare"]["legend"];
  decorative?: boolean;
}) {
  const Icon = value === "yes" ? Check : value === "partial" ? Minus : X;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : legend[value]}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full",
        value === "yes" && "bg-ok/15 text-ok",
        value === "partial" && "bg-warn/15 text-warn",
        value === "no" && "bg-subtle text-muted",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
}
