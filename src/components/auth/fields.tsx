"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState, type InputHTMLAttributes } from "react";
import { COUNTRY_CODES } from "@/lib/auth/phone";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Button, Input, Label, Select } from "@/components/ui";

/** Error text placed right under the field or form it belongs to. */
export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-danger">
      {message}
    </p>
  );
}

export function PasswordInput({
  id,
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <div className="relative">
        <Input id={id} type={shown ? "text" : "password"} className="pr-11" {...props} />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? t.auth.actions.hidePassword : t.auth.actions.showPassword}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted hover:text-foreground"
        >
          {shown ? (
            <EyeOff aria-hidden className="h-4 w-4" />
          ) : (
            <Eye aria-hidden className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

/** One field for the whole code; phones autofill it from the SMS (one-time-code). */
export function CodeInput({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6,10}"
        placeholder="123456"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="text-center font-mono text-xl tracking-[0.5em] sm:text-xl"
        required
        autoFocus
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function isCode(value: string) {
  return /^\d{6,10}$/.test(value);
}

/** Country code + local number. Parent combines them with toE164(). */
export function PhoneInput({
  id,
  country,
  onCountry,
  number,
  onNumber,
  error,
}: {
  id: string;
  country: string;
  onCountry: (v: string) => void;
  number: string;
  onNumber: (v: string) => void;
  error?: string | null;
}) {
  const t = useT();
  const known = COUNTRY_CODES.some((c) => c.code === country);
  const [custom, setCustom] = useState(!known);
  return (
    <div>
      <Label htmlFor={id}>{t.auth.fields.phone}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="sm:w-40 sm:shrink-0">
          <label htmlFor={`${id}-country`} className="sr-only">
            {t.auth.fields.country}
          </label>
          {custom ? (
            <Input
              id={`${id}-country`}
              value={country}
              onChange={(e) => onCountry(e.target.value)}
              placeholder={t.auth.fields.customCode}
              inputMode="tel"
            />
          ) : (
            <Select
              id={`${id}-country`}
              value={country}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  setCustom(true);
                  onCountry("+");
                } else onCountry(e.target.value);
              }}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
              <option value="custom">{t.auth.fields.other}</option>
            </Select>
          )}
        </div>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={(e) => onNumber(e.target.value)}
          placeholder={t.auth.fields.phonePlaceholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** "Resend code" with a cooldown so people can't hit Supabase's rate limit by accident. */
export function ResendButton({
  onResend,
  cooldown = 60,
}: {
  onResend: () => Promise<boolean>;
  cooldown?: number;
}) {
  const t = useT();
  const [left, setLeft] = useState(cooldown);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={left > 0 || busy}
      onClick={async () => {
        setBusy(true);
        const ok = await onResend();
        setBusy(false);
        if (ok) setLeft(cooldown);
      }}
    >
      {left > 0 ? fmt(t.auth.actions.resendIn, { s: left }) : t.auth.actions.resend}
    </Button>
  );
}
