import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Resolves the `@/*` alias from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    // src/shared/config/env.ts validates on import; tests get a fixed, fake API origin.
    env: { NEXT_PUBLIC_API_BASE_URL: "https://api.test" },
    // The default 5 s per test is tight for multi-step form tests when the
    // machine is busy (CI runners, several suites at once); a passing test is no slower.
    testTimeout: 15_000,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/mocks/**",
        "src/shared/api/schema.ts",
      ],
      reporter: ["text", "html"],
    },
  },
});
