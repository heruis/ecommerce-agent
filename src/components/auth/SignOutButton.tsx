"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/components/ui";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const t = useT();
  return (
    <button
      type="button"
      className={cn("inline-flex items-center gap-2 text-muted hover:text-foreground", className)}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut aria-hidden className="h-4 w-4" />
      {t.common.nav.signOut}
    </button>
  );
}
