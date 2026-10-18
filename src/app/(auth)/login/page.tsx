import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { DemoLoginForm } from "@/components/auth/DemoLoginForm";
import { SupabaseAuthForm } from "@/components/auth/SupabaseAuthForm";
import { Card } from "@/components/ui";

/** Sign in / sign up. Owner: WS4. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (await getSessionUser()) redirect(target);
  const demo = env().DATA_MODE === "memory";
  return (
    <div className="mx-auto max-w-sm">
      <Card className="space-y-4">
        <h1 className="text-xl font-semibold">Sign in to ListWise</h1>
        {demo ? <DemoLoginForm next={target} /> : <SupabaseAuthForm next={target} />}
      </Card>
    </div>
  );
}
