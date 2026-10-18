import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: every app page reads the auth session,
  // and keeping the classic dynamic model is simpler for a 5-person team.
  // See memory/decisions.md (D-007) before turning it on.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The policy knowledge base is read from disk at runtime by the RAG retriever.
  outputFileTracingIncludes: {
    "/api/**": ["./knowledge/**/*"],
  },
};

export default nextConfig;
