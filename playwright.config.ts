import { defineConfig, devices } from "@playwright/test";

// Smoke tests run the whole app in mock mode: no API keys, no database.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Optional: point at a preinstalled Chromium (e.g. cloud sandboxes) instead of `playwright install`.
        launchOptions: process.env.PW_CHROMIUM_PATH
          ? { executablePath: process.env.PW_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: "pnpm build && pnpm start -p 3100",
    url: "http://localhost:3100/api/health",
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { AI_MODE: "mock", DATA_MODE: "memory", BILLING_MODE: "mock" },
  },
});
