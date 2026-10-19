import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { SignOutButton } from "./auth/SignOutButton";

/** Top navigation; shows remaining runs when signed in. Owner: WS3. */
export async function SiteHeader() {
  const user = await getSessionUser();
  const profile = user ? await getRepo().ensureProfile(user) : null;
  return (
    <header className="border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Shelf<span className="text-brand">Pass</span>{" "}
          <span className="ml-1 text-xs font-normal text-muted">上架通</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard">Listings</Link>
              <Link href="/listings/new">New listing</Link>
              <Link href="/billing">
                Billing
                {profile ? (
                  <span className="ml-1 text-muted">({profile.credits_remaining} runs)</span>
                ) : null}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/#pricing">Pricing</Link>
              <Link href="/login" className="rounded-lg bg-brand px-3 py-1.5 text-brand-foreground">
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
