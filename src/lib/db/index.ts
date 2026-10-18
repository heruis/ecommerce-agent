import type { Repo } from "@/lib/contracts";
import { env } from "@/lib/env";
import { MemoryRepo } from "./memory";
import { SupabaseRepo } from "./supabase";

/** The app's data access port, selected by DATA_MODE. */
export function getRepo(): Repo {
  return env().DATA_MODE === "supabase" ? new SupabaseRepo() : new MemoryRepo();
}

export { MemoryRepo, resetMemoryStore } from "./memory";
