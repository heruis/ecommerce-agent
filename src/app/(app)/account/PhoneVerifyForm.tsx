"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authErrorKey } from "@/lib/auth/errors";
import { toE164 } from "@/lib/auth/phone";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Alert, Button, Spinner } from "@/components/ui";
import { CodeInput, isCode, PhoneInput, ResendButton } from "@/components/auth/fields";

/**
 * Add or change the account's phone number: Supabase texts a code to the new
 * number (updateUser) and the change is applied once the code is verified
 * (verifyOtp type "phone_change"). Owner: WS4.
 */
export function PhoneVerifyForm({
  hasPhone,
  pendingPhone,
}: {
  hasPhone: boolean;
  pendingPhone: string | null;
}) {
  const t = useT();
  const s = t.account.signin;
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(pendingPhone));
  const [country, setCountry] = useState("+1");
  const [number, setNumber] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(pendingPhone);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const supabase = () => createSupabaseBrowserClient();
  const errorText = (e: unknown) => t.auth.errors[authErrorKey(e)];

  async function send(phone: string): Promise<boolean> {
    const { error: err } = await supabase().auth.updateUser({ phone });
    if (err) {
      setError(errorText(err));
      return false;
    }
    return true;
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const parsed = toE164(country, number);
    if (!parsed.ok) return setError(t.auth.errors.invalidPhone);
    setBusy(true);
    setError(null);
    const ok = await send(parsed.phone);
    setBusy(false);
    if (ok) {
      setCode("");
      setSentTo(parsed.phone);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    if (!isCode(code)) return setCodeError(t.auth.errors.codeFormat);
    setBusy(true);
    setCodeError(null);
    const { error: err } = await supabase().auth.verifyOtp({
      phone: sentTo,
      token: code,
      type: "phone_change",
    });
    setBusy(false);
    if (err) return setCodeError(errorText(err));
    setDone(true);
    setOpen(false);
    setSentTo(null);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {done ? <Alert tone="ok">{s.phoneVerified}</Alert> : null}
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {hasPhone ? s.changePhone : s.addPhone}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-subtle/40 p-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {sentTo ? (
        <form onSubmit={onVerify} className="space-y-3" noValidate>
          <p className="text-sm text-muted">{fmt(s.codeSent, { phone: sentTo })}</p>
          <CodeInput
            id="phone-change-code"
            label={s.code}
            value={code}
            onChange={(v) => {
              setCode(v);
              setCodeError(null);
            }}
            error={codeError}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Spinner /> : null}
              {s.verify}
            </Button>
            <ResendButton onResend={() => send(sentTo)} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSentTo(null);
                setOpen(false);
              }}
            >
              {s.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={onSend} className="space-y-3" noValidate>
          <p className="text-sm text-muted">{s.phoneHelp}</p>
          <PhoneInput
            id="account-phone"
            country={country}
            onCountry={setCountry}
            number={number}
            onNumber={(v) => {
              setNumber(v);
              setError(null);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? <Spinner /> : null}
              {s.sendCode}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
