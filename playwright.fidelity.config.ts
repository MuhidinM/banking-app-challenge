import { defineConfig } from "@playwright/test";

import base from "./playwright.config";

/** `pnpm fidelity`: only the screenshots for docs/fidelity.md (e2e/fidelity). */
export default defineConfig({
  ...base,
  testDir: "./e2e/fidelity",
  testIgnore: [],
  retries: 0,
});
