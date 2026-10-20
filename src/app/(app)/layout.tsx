import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { Container } from "@/components/ui";

/** Everything under (app) requires a signed-in user. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <Container className="py-8 sm:py-10">{children}</Container>;
}
