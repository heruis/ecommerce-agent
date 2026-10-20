"use client";

import { ArrowLeft, Mail, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authErrorKey } from "@/lib/auth/errors";
import { toE164 } from "@/lib/auth/phone";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Alert, Button, cn, Input, Label, Spinner } from "@/components/ui";
import { CodeInput, FieldError, isCode, PasswordInput, PhoneInput, ResendButton } from "./fields";

export type AuthMode = "signin" | "signup" | "phone";

type Step =
  | { kind: "form" }
  | { kind: "emailCode"; email: string; note: "sent" | "unconfirmed" }
  | { kind: "phoneCode"; phone: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Supabase sign-in, sign-up and phone sign-in (DATA_MODE=supabase).
 * Email confirmation works two ways: the 6-digit code typed here
 * (verifyOtp type "signup") or the link in the email (/auth/confirm or
 * /auth/callback). Owner: WS4.
 */
export function AuthPanel({
  initialMode,
  next,
  freeCredits,
  linkError,
}: {
  initialMode: AuthMode;
  next: string;
  freeCredits: number;
  linkError: string | null;
}) {
  const t = useT();
  const a = t.auth;
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [info, setInfo] = useState<string | null>(null);

  const supabase = () => createSupabaseBrowserClient();
  const errorText = (e: unknown) => a.errors[authErrorKey(e)];
  const done = () => {
    router.push(next);
    router.refresh();
  };

  function switchMode(m: AuthMode) {
    setMode(m);
    setStep({ kind: "form" });
    setError(null);
    setInfo(null);
    setFieldErrors({});
    const url = new URL(window.location.href);
    url.searchParams.set("mode", m);
    window.history.replaceState(null, "", url);
  }

  function checkEmailPassword(requireLength: boolean) {
    const errs: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = a.errors.invalidEmail;
    if (requireLength ? password.length < 8 : password.length === 0)
      errs.password = a.errors.passwordTooShort;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function resendSignupCode(target: string): Promise<boolean> {
    const { error: e } = await supabase().auth.resend({ type: "signup", email: target });
    if (e) {
      setError(errorText(e));
      return false;
    }
    setInfo(a.verify.resent);
    return true;
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault();
    if (!checkEmailPassword(false)) return;
    setBusy(true);
    setError(null);
    const target = email.trim().toLowerCase();
    const { error: err } = await supabase().auth.signInWithPassword({ email: target, password });
    setBusy(false);
    if (!err) return done();
    if (authErrorKey(err) === "emailNotConfirmed") {
      setStep({ kind: "emailCode", email: target, note: "unconfirmed" });
      setCode("");
      // The code from sign-up may have expired; send a fresh one (ignore rate limits).
      void supabase().auth.resend({ type: "signup", email: target });
      return;
    }
    setError(errorText(err));
  }

  async function onSignUp(e: FormEvent) {
    e.preventDefault();
    if (!checkEmailPassword(true)) return;
    setBusy(true);
    setError(null);
    const target = email.trim().toLowerCase();
    const { data, error: err } = await supabase().auth.signUp({
      email: target,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (err) return setError(errorText(err));
    if (data.session) return done(); // email confirmation is off
    // With confirmation on, an existing address returns a user with no identities.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return setError(a.errors.userExists);
    }
    setCode("");
    setStep({ kind: "emailCode", email: target, note: "sent" });
  }

  async function onVerifyEmail(e: FormEvent) {
    e.preventDefault();
    if (step.kind !== "emailCode") return;
    if (!isCode(code)) return setFieldErrors({ code: a.errors.codeFormat });
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.verifyOtp({
      email: step.email,
      token: code,
      type: "signup",
    });
    setBusy(false);
    if (err) return setFieldErrors({ code: errorText(err) });
    done();
  }

  async function onSendPhoneCode(e: FormEvent) {
    e.preventDefault();
    const parsed = toE164(country, phoneNumber);
    if (!parsed.ok) return setFieldErrors({ phone: a.errors.invalidPhone });
    setFieldErrors({});
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.signInWithOtp({ phone: parsed.phone });
    setBusy(false);
    if (err) return setError(errorText(err));
    setCode("");
    setStep({ kind: "phoneCode", phone: parsed.phone });
  }

  async function onVerifyPhone(e: FormEvent) {
    e.preventDefault();
    if (step.kind !== "phoneCode") return;
    if (!isCode(code)) return setFieldErrors({ code: a.errors.codeFormat });
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.verifyOtp({
      phone: step.phone,
      token: code,
      type: "sms",
    });
    setBusy(false);
    if (err) return setFieldErrors({ code: errorText(err) });
    done();
  }

  const heading =
    mode === "signup" ? a.heading.signup : mode === "phone" ? a.heading.phone : a.heading.signin;
  const sub =
    mode === "signup"
      ? fmt(a.sub.signup, { n: freeCredits })
      : mode === "phone"
        ? a.sub.phone
        : a.sub.signin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        <p className="mt-1.5 text-sm text-muted">{sub}</p>
      </div>

      {step.kind === "form" ? (
        <div
          role="tablist"
          aria-label={a.tabs.label}
          className="grid grid-cols-3 gap-1 rounded-lg bg-subtle p-1"
        >
          {(["signin", "signup", "phone"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              id={`tab-${m}`}
              aria-selected={mode === m}
              aria-controls="auth-panel"
              onClick={() => switchMode(m)}
              className={cn(
                "min-h-10 rounded-md px-2 text-sm font-semibold transition-colors duration-200",
                mode === m
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {a.tabs[m]}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {info ? <Alert tone="ok">{info}</Alert> : null}

      <div id="auth-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
        {step.kind === "emailCode" ? (
          <form onSubmit={onVerifyEmail} className="space-y-4" noValidate>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-subtle/60 p-4">
              <Mail aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="text-sm">
                <p className="font-semibold">{a.verify.emailTitle}</p>
                <p className="mt-1 text-muted">
                  {step.note === "unconfirmed"
                    ? a.verify.unconfirmed
                    : fmt(a.verify.emailBody, { email: step.email })}
                </p>
                <p className="mt-1 text-xs text-muted">{a.verify.spam}</p>
              </div>
            </div>
            <CodeInput
              id="email-code"
              label={a.fields.code}
              value={code}
              onChange={(v) => {
                setCode(v);
                setFieldErrors({});
              }}
              error={fieldErrors.code}
            />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {a.actions.verify}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BackButton
                label={a.actions.useDifferentEmail}
                onClick={() => setStep({ kind: "form" })}
              />
              <ResendButton onResend={() => resendSignupCode(step.email)} />
            </div>
          </form>
        ) : step.kind === "phoneCode" ? (
          <form onSubmit={onVerifyPhone} className="space-y-4" noValidate>
            <div className="flex items-start gap-3 rounded-lg border border-border bg-subtle/60 p-4">
              <Smartphone aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div className="text-sm">
                <p className="font-semibold">{a.verify.phoneTitle}</p>
                <p className="mt-1 text-muted">{fmt(a.verify.phoneBody, { phone: step.phone })}</p>
              </div>
            </div>
            <CodeInput
              id="phone-code"
              label={a.fields.code}
              value={code}
              onChange={(v) => {
                setCode(v);
                setFieldErrors({});
              }}
              error={fieldErrors.code}
            />
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {a.actions.verify}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BackButton
                label={a.actions.useDifferentPhone}
                onClick={() => setStep({ kind: "form" })}
              />
              <ResendButton
                onResend={async () => {
                  const { error: err } = await supabase().auth.signInWithOtp({
                    phone: step.phone,
                  });
                  if (err) {
                    setError(errorText(err));
                    return false;
                  }
                  setInfo(a.verify.resent);
                  return true;
                }}
              />
            </div>
          </form>
        ) : mode === "phone" ? (
          <form onSubmit={onSendPhoneCode} className="space-y-4" noValidate>
            <PhoneInput
              id="phone"
              country={country}
              onCountry={setCountry}
              number={phoneNumber}
              onNumber={(v) => {
                setPhoneNumber(v);
                setFieldErrors({});
              }}
              error={fieldErrors.phone}
            />
            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {a.actions.sendCode}
            </Button>
          </form>
        ) : (
          <form onSubmit={mode === "signup" ? onSignUp : onSignIn} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email">{a.fields.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                required
              />
              <FieldError id="email-error" message={fieldErrors.email} />
            </div>
            <div>
              <PasswordInput
                id="password"
                label={a.fields.password}
                hint={mode === "signup" ? a.fields.passwordHint : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                required
              />
              <FieldError id="password-error" message={fieldErrors.password} />
            </div>
            {mode === "signin" ? (
              <div className="text-right">
                <Link
                  href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {a.actions.forgot}
                </Link>
              </div>
            ) : null}
            <Button
              type="submit"
              variant={mode === "signup" ? "accent" : "primary"}
              size="lg"
              className="w-full"
              disabled={busy}
            >
              {busy ? <Spinner /> : null}
              {mode === "signup" ? a.actions.signup : a.actions.signin}
            </Button>
            {mode === "signup" ? (
              <p className="text-center text-xs text-muted">
                {a.legal.prefix}{" "}
                <Link href="/terms" className="underline hover:text-foreground">
                  {a.legal.terms}
                </Link>{" "}
                {a.legal.and}{" "}
                <Link href="/privacy" className="underline hover:text-foreground">
                  {a.legal.privacy}
                </Link>
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
    >
      <ArrowLeft aria-hidden className="h-4 w-4" />
      {label}
    </button>
  );
}
