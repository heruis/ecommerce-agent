import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { ForgotPasswordForm } from "@/components/auth/PasswordForms";
import { Alert, Card } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).auth.meta.forgot };
}

/** Request a password-reset email (Supabase mode only). Owner: WS4. */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>;
}) {
  if (env().DATA_MODE !== "supabase") notFound();
  const [t, { email, error }] = await Promise.all([getT(), searchParams]);
  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-5 p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.meta.forgot}</h1>
        {error ? <Alert tone="warn">{t.auth.reset.expired}</Alert> : null}
        <ForgotPasswordForm initialEmail={email?.slice(0, 200) ?? ""} />
      </Card>
    </div>
  );
}
