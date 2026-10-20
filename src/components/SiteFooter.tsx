import Link from "next/link";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { Logo } from "./layout/Logo";

/** Footer with product and legal links and the risk-screening disclaimer. Owner: WS3. */
export async function SiteFooter() {
  const t = await getT();
  const f = t.common.footer;
  const n = t.common.nav;
  const linkClass = "text-sm text-muted hover:text-foreground";
  return (
    <footer className="mt-auto border-t border-border bg-surface print:hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted">{t.common.brandTagline}</p>
          <p className="max-w-md text-xs text-muted">{f.disclaimer}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{f.product}</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/#how-it-works" className={linkClass}>
                {n.howItWorks}
              </Link>
            </li>
            <li>
              <Link href="/pricing" className={linkClass}>
                {n.pricing}
              </Link>
            </li>
            <li>
              <Link href="/listings/new" className={linkClass}>
                {n.newReport}
              </Link>
            </li>
            <li>
              <Link href="/audit" className={linkClass}>
                {n.audit}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">{f.legal}</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/terms" className={linkClass}>
                {f.terms}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                {f.privacy}
              </Link>
            </li>
            <li>
              <Link href="/refunds" className={linkClass}>
                {f.refunds}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-muted sm:px-6">
          <span>{fmt(f.rights, { year: new Date().getFullYear() })}</span>
          <span>{f.capstone}</span>
        </div>
      </div>
    </footer>
  );
}
