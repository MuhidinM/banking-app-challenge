// Shared setup for every Vitest file (see vitest.config.mts).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "@/mocks/node";
import { resetMockApi } from "@/mocks/state";

// jsdom lacks a few browser APIs that Radix's Select calls while opening and
// choosing; no-op stand-ins let component tests drive it with the keyboard.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

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
