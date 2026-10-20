"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-render the page every few seconds while a run is still in progress. */
export function AutoRefresh({ everyMs = 3000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
