import Link from "next/link";

/** Wordmark: a shelf with a check mark — "passes the shelf". Owner: WS3. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 font-bold tracking-tight">
      <svg viewBox="0 0 32 32" aria-hidden className="h-8 w-8 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-brand" />
        <path d="M7 22h18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M10.5 14.5l3.5 3.5 7.5-8"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg">
        Shelf<span className="text-brand">Pass</span>
      </span>
      <span className="hidden text-xs font-medium text-muted sm:inline">上架通</span>
    </Link>
  );
}
