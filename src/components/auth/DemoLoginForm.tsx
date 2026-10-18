"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";

/** DATA_MODE=memory: sign in with only an email address. */
export function DemoLoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("demo@listwise.dev");
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      setError("Enter a valid email address.");
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" className="w-full">
        Continue
      </Button>
      <p className="text-xs text-muted">
        Demo mode: no password, data is kept in memory until the server restarts.
      </p>
    </form>
  );
}
