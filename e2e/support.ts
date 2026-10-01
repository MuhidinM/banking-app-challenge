import { test as base, expect, type Page } from "@playwright/test";

import { DEMO_PASSWORD } from "../src/mocks/fixtures";

export { expect };

export const JANE = { username: "demo.jane", name: "Jane Doe" };

/** Hosts a page may contact: the app itself and the never-resolving API host the mock answers for. */
const ALLOWED_HOSTS = new Set(["localhost", "api.e2e.invalid"]);

/**
 * Every test fails if the page breaks the Content-Security-Policy or sends a
 * request anywhere but the app and the mocked API, so a missing mock handler
 * or a too-strict policy shows up here rather than in a reviewer's browser.
 */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ context }, use) => {
      const problems: string[] = [];
      context.on("page", watch);
      context.pages().forEach(watch);
      function watch(page: Page) {
        page.on("console", (message) => {
          if (message.type() === "error" && message.text().includes("Content Security Policy")) {
            problems.push(`CSP: ${message.text()}`);
          }
        });
        page.on("request", (request) => {
          const { hostname, protocol } = new URL(request.url());
          if (/^https?:$/.test(protocol) && !ALLOWED_HOSTS.has(hostname)) {
            problems.push(`request to ${request.url()}`);
          }
        });
      }
      await use();
      expect(problems).toEqual([]);
    },
    { auto: true },
  ],
});

/** Signs in through the login form; the mock API answers in the browser. */
export async function signIn(
  page: Page,
  { username = JANE.username, password = DEMO_PASSWORD } = {},
) {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
}

/** Signed in: the sidebar shows the user and a way out. */
export async function expectSignedIn(page: Page, name = JANE.name) {
  await expect(page.getByText(name).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" }).first()).toBeVisible();
}
