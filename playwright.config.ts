import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build in mock mode (ADR-0009): the
 * MSW service worker answers every API call in the browser, so nothing reaches
 * the shared API. The API origin is a `.invalid` host, which never resolves, so
 * a request the mock doesn't handle fails instead of going anywhere.
 */
const PORT = Number(process.env.E2E_PORT ?? 3003);
const baseURL = `http://localhost:${PORT}`;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  // The fidelity screenshots run on their own: `pnpm fidelity`.
  testIgnore: "fidelity/**",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `${baseURL}/login`,
    // Locally, `pnpm e2e` reuses an app already running on the port.
    reuseExistingServer: !CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_API_MOCKING: "on",
      NEXT_PUBLIC_API_BASE_URL: "https://api.e2e.invalid",
      NEXT_PUBLIC_DEV_TOOLS: "off",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
