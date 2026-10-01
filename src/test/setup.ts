// Shared setup for every Vitest file (see vitest.config.mts).
import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "@/mocks/node";
import { resetMockApi } from "@/mocks/state";

// jsdom lacks a few browser APIs that Radix's Select calls while opening and
// choosing; no-op stand-ins let component tests drive it with the keyboard.
// (Files that run in the node environment, like the route proxy's, have no DOM.)
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// findBy* and waitFor give up after 1 s by default. Screens that chain requests
// (user, then accounts, then transactions) can need longer while the whole
// suite runs in parallel, so allow 3 s; a passing check still returns at once.
configure({ asyncUtilTimeout: 3000 });

// Every request goes to the mock API; one it doesn't handle fails the test
// instead of reaching the real (shared) API.
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  // Vitest globals are off, so React Testing Library can't register its own cleanup.
  cleanup();
  // Drop per-test handler overrides and restore the seed data and tokens.
  server.resetHandlers();
  resetMockApi();
});

afterAll(() => {
  server.close();
});
