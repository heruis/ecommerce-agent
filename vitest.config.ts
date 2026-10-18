import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      "server-only": r("./src/lib/testing/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "evals/**/*.test.ts"],
    env: {
      AI_MODE: "mock",
      DATA_MODE: "memory",
      BILLING_MODE: "mock",
      RAG_MODE: "lexical",
    },
  },
});
