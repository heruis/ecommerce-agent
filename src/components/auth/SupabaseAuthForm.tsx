"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";
import { Button, Input, Label, Spinner } from "@/components/ui";

/**
 * Email + password sign-in / sign-up with Supabase Auth. Owner: WS4.
 * TODO(WS4): password reset, email confirmation UX, Google OAuth (stretch).
 */
export function SupabaseAuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
          });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (mode === "signup" && !data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {message ? <p className="text-sm text-warn">{message}</p> : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : null} {mode === "signin" ? "Sign in" : "Create account"}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-brand underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </form>
  );
}
