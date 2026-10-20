import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser, safeNext } from "@/lib/auth";
import { plans } from "@/lib/billing";
import { env } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { AuthPanel, type AuthMode } from "@/components/auth/AuthPanel";
import { DemoLoginForm } from "@/components/auth/DemoLoginForm";
import { Card } from "@/components/ui";

type Search = Promise<{ next?: string; mode?: string; error?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Search;
}): Promise<Metadata> {
  const [t, { mode }] = await Promise.all([getT(), searchParams]);
  return { title: mode === "signup" ? t.auth.meta.signup : t.auth.meta.signin };
}

/** Sign in, create an account, or sign in with a phone code. Owner: WS4. */
export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const { next, mode, error } = await searchParams;
  const target = safeNext(next);
  if (await getSessionUser()) redirect(target);
  const t = await getT();
  const initialMode: AuthMode = mode === "signup" || mode === "phone" ? mode : "signin";
  const linkErrors = t.auth.linkErrors as Record<string, string>;
  const linkError = error ? (linkErrors[error] ?? t.auth.linkErrors.link_invalid) : null;

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-6 sm:p-8">
        {env().DATA_MODE === "memory" ? (
          <DemoLoginForm next={target} />
        ) : (
          <AuthPanel
            initialMode={initialMode}
            next={target}
            freeCredits={plans().free.credits}
            linkError={linkError}
          />
        )}
      </Card>
    </div>
  );
}
