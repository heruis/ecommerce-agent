import { CheckCircle2, CircleAlert, Download } from "lucide-react";
import type { Metadata } from "next";
import { getAuthDetails, requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { fmt, type Locale } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n/server";
import { NewPasswordForm } from "@/components/auth/PasswordForms";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Badge, buttonClass, ButtonLink, Card, PageHeader } from "@/components/ui";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { PhoneVerifyForm } from "./PhoneVerifyForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).account.meta.title };
}

/** Sign-in details, plan, password, language, data export and deletion. Owner: WS4. */
export default async function AccountPage() {
  const user = await requireUser("/account");
  const [t, locale, details, profile] = await Promise.all([
    getT(),
    getLocale(),
    getAuthDetails(),
    getRepo().ensureProfile(user),
  ]);
  const a = t.account;
  const s = a.signin;
  const live = details?.mode === "supabase";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={a.title} subtitle={a.subtitle} />
      <div className="space-y-6">
        <Section title={s.title}>
          <dl className="divide-y divide-border">
            <Row label={s.email}>
              {details?.email ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-all">{details.email}</span>
                  {live ? <Verified ok={details.emailVerified} t={s} /> : null}
                </span>
              ) : (
                <span className="text-muted">{s.noEmail}</span>
              )}
            </Row>
            <Row label={s.phone}>
              {live ? (
                <div className="space-y-3">
                  {details.phone ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{details.phone}</span>
                      <Verified ok={details.phoneVerified} t={s} />
                    </span>
                  ) : (
                    <span className="text-muted">{s.noPhone}</span>
                  )}
                  {details.pendingPhone ? (
                    <p className="text-sm text-warn">
                      {fmt(s.pending, { phone: details.pendingPhone })}
                    </p>
                  ) : null}
                  <PhoneVerifyForm
                    hasPhone={Boolean(details.phone)}
                    pendingPhone={details.pendingPhone}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted">{s.phoneDemo}</span>
              )}
            </Row>
          </dl>
          {!live ? <p className="mt-3 text-xs text-muted">{s.demo}</p> : null}
        </Section>

        <Section title={a.plan.title}>
          <dl className="divide-y divide-border">
            <Row label={a.plan.plan}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {profile.plan === "pro" ? a.plan.pro : a.plan.free}
                </span>
                {profile.plan === "pro" && profile.current_period_end ? (
                  <span className="text-sm text-muted">
                    {fmt(a.plan.renews, {
                      date: formatDate(profile.current_period_end, locale),
                    })}
                  </span>
                ) : null}
              </span>
            </Row>
            <Row label={a.plan.credits}>
              <span className="text-lg font-semibold tabular-nums">
                {profile.credits_remaining}
              </span>
            </Row>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/billing" variant="secondary" size="sm">
              {a.plan.billing}
            </ButtonLink>
            <ButtonLink href="/pricing" variant="accent" size="sm">
              {a.plan.buy}
            </ButtonLink>
          </div>
        </Section>

        {live && details.email ? (
          <Section title={a.password.title} body={a.password.body}>
            <NewPasswordForm
              after="stay"
              submitLabel={a.password.submit}
              doneLabel={a.password.done}
            />
          </Section>
        ) : null}

        <Section title={a.language.title} body={a.language.body}>
          <LanguageSwitcher className="inline-block" />
        </Section>

        <Section title={a.data.title} body={a.data.body}>
          {/* A plain link: the browser downloads the JSON attachment. */}
          <a href="/api/account/export" className={buttonClass("secondary", "sm")}>
            <Download aria-hidden className="h-4 w-4" />
            {a.data.download}
          </a>
        </Section>

        <Section title={a.danger.title} body={a.danger.body} danger>
          <DeleteAccountForm />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  body,
  danger,
  children,
}: {
  title: string;
  body?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={danger ? "border-danger/30" : undefined}>
      <h2 className={`text-lg font-semibold ${danger ? "text-danger" : ""}`}>{title}</h2>
      {body ? <p className="mt-1 text-sm text-muted">{body}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function Verified({ ok, t }: { ok: boolean; t: { verified: string; unverified: string } }) {
  return ok ? (
    <Badge tone="ok">
      <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
      {t.verified}
    </Badge>
  ) : (
    <Badge tone="warn">
      <CircleAlert aria-hidden className="h-3.5 w-3.5" />
      {t.unverified}
    </Badge>
  );
}

function formatDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
