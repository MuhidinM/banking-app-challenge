import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";
import { restoreMockApi, snapshotMockApi } from "./state";

/** Where the browser mock keeps its data between page loads. */
export const MOCK_API_STORAGE_KEY = "kb-mock-api";

/** Intercepts requests in the browser through public/mockServiceWorker.js. */
export const worker = setupWorker(...handlers);

// The mock's data lives in this page's memory. Without saving it, a reload
// would start a fresh mock that rejects the stored refresh token (so the user
// would be signed out) and forgets every transfer. Storage can be unavailable
// (private mode, blocked site data): then the mock still works until reload.
try {
  const saved = localStorage.getItem(MOCK_API_STORAGE_KEY);
  if (saved !== null && !restoreMockApi(saved)) localStorage.removeItem(MOCK_API_STORAGE_KEY);
} catch {
  // Start from the seed data.
}

worker.events.on("response:mocked", () => {
  try {
    localStorage.setItem(MOCK_API_STORAGE_KEY, snapshotMockApi());
  } catch {
    // Not saved; the mock keeps working in memory.
  }
});
