import type { ReactNode } from "react";
import { cn, Eyebrow } from "@/components/ui";

/** Eyebrow + heading + optional intro, centered by default. Owner: WS3. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  id,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  id?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 max-w-3xl space-y-3",
        align === "center" ? "mx-auto text-center" : "",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="text-lg text-pretty text-muted">{subtitle}</p> : null}
    </div>
  );
}
