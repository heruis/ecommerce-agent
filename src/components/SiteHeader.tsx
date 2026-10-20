import Link from "next/link";
import { ChevronDown, Menu, Coins } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { SignOutButton } from "./auth/SignOutButton";
import { LanguageSwitcher } from "./layout/LanguageSwitcher";
import { Logo } from "./layout/Logo";
import { ButtonLink } from "./ui";

/**
 * Sticky, translucent top bar (design system: light glass on navigation).
 * Desktop: inline links. Mobile: a <details> menu that works without JS.
 * Owner: WS3.
 */
export async function SiteHeader() {
  const [user, t] = await Promise.all([getSessionUser(), getT()]);
  const profile = user ? await getRepo().ensureProfile(user) : null;
  const n = t.common.nav;

  const appLinks = [
    { href: "/dashboard", label: n.dashboard },
    { href: "/listings/new", label: n.newReport },
    { href: "/audit", label: n.audit },
    { href: "/appeal", label: n.appeal },
    { href: "/evidence", label: n.evidence },
  ];
  const publicLinks = [
    { href: "/#how-it-works", label: n.howItWorks },
    { href: "/#features", label: n.product },
    { href: "/pricing", label: n.pricing },
  ];
  const links = user ? appLinks : publicLinks;
  const linkClass =
    "rounded-md px-2.5 py-2 text-sm font-medium text-muted transition-colors duration-200 hover:bg-subtle hover:text-foreground";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/80 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo href={user ? "/dashboard" : "/"} />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:block" />
          {user ? (
            <details className="group relative hidden lg:block">
              <summary className="flex min-h-9 list-none items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:border-brand/40 [&::-webkit-details-marker]:hidden">
                <Coins aria-hidden className="h-4 w-4 text-accent" />
                {profile ? fmt(n.credits, { n: profile.credits_remaining }) : n.account}
                <ChevronDown aria-hidden className="h-4 w-4 text-muted group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-pop">
                <p className="truncate px-2.5 py-1.5 text-xs text-muted">{user.email}</p>
                <Link href="/account" className={`${linkClass} block`}>
                  {n.account}
                </Link>
                <Link href="/billing" className={`${linkClass} block`}>
                  {n.billing}
                </Link>
                <SignOutButton className={`${linkClass} w-full`} />
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className={`${linkClass} hidden sm:inline-flex`}>
                {n.signIn}
              </Link>
              <ButtonLink href="/login?mode=signup" variant="accent" size="sm">
                {n.startFree}
              </ButtonLink>
            </>
          )}

          <details className="group relative lg:hidden">
            <summary
              aria-label={n.menu}
              className="flex h-10 w-10 list-none items-center justify-center rounded-lg border border-border hover:bg-subtle [&::-webkit-details-marker]:hidden"
            >
              <Menu aria-hidden className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-pop">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className={`${linkClass} block`}>
                  {l.label}
                </Link>
              ))}
              <div className="my-2 border-t border-border" />
              {user ? (
                <>
                  <p className="px-2.5 py-1 text-xs text-muted">
                    {profile ? fmt(n.credits, { n: profile.credits_remaining }) : null}
                  </p>
                  <Link href="/account" className={`${linkClass} block`}>
                    {n.account}
                  </Link>
                  <Link href="/billing" className={`${linkClass} block`}>
                    {n.billing}
                  </Link>
                  <SignOutButton className={`${linkClass} w-full`} />
                </>
              ) : (
                <Link href="/login" className={`${linkClass} block`}>
                  {n.signIn}
                </Link>
              )}
              <LanguageSwitcher className="mt-2 block px-2.5 sm:hidden" />
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
