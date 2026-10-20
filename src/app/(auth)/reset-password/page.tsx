import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { NewPasswordForm } from "@/components/auth/PasswordForms";
import { Alert, Card } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).auth.meta.reset };
}

/**
 * Landing page of the password-reset email: the link signs the user in
 * (via /auth/callback or /auth/confirm), then they choose a new password.
 * Owner: WS4.
 */
export default async function ResetPasswordPage() {
  if (env().DATA_MODE !== "supabase") notFound();
  const [t, user] = await Promise.all([getT(), getSessionUser()]);
  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-5 p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.meta.reset}</h1>
        {user ? (
          <>
            <p className="text-sm text-muted">{t.auth.reset.newBody}</p>
            <NewPasswordForm
              after="dashboard"
              submitLabel={t.auth.actions.updatePassword}
              doneLabel={t.auth.reset.done}
            />
          </>
        ) : (
          <>
            <Alert tone="warn">{t.auth.reset.expired}</Alert>
            <Link
              href="/forgot-password"
              className="inline-block text-sm font-medium text-brand hover:underline"
            >
              {t.auth.actions.sendReset}
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
