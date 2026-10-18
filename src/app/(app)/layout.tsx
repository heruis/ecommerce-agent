import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";

/** Everything under (app) requires a signed-in user. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
