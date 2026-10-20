import type { ReactNode } from "react";
import { Container } from "@/components/ui";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <Container className="py-12 sm:py-16">{children}</Container>;
}
