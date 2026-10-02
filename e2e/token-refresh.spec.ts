import { expect, expectSignedIn, signIn, test } from "./support";

/**
 * Access tokens live 10 minutes (the API's lifetime, mirrored by the mock).
 * The mock runs in the page, so Playwright's clock moves its time too: after
 * 11 minutes the next requests are refused, one refresh renews the token,
 * and they are retried (ADR-0005) without the user noticing.
 */
test("an expired access token is refreshed once and the request retried", async ({ page }) => {
  await page.clock.install();
  await page.goto("/login");
  await signIn(page);
  await expectSignedIn(page);

  // The mock answers inside the page, where Playwright's network events
  // don't see it, so record the app's own fetch calls instead.
  await page.evaluate(() => {
    const calls: string[] = [];
    Object.assign(window, { apiCalls: calls });
    const fetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await fetch(input, init);
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname.startsWith("/api/")) calls.push(`${response.status} ${url.pathname}`);
      return response;
    };
  });
  const apiCalls = () =>
    page.evaluate(() => (window as unknown as { apiCalls: string[] }).apiCalls);

  await page.clock.fastForward("11:00");
  // Savings' history isn't cached yet, so this is sure to call the API.
  await page.getByRole("link", { name: "Activity" }).first().click();
  const account = page.getByRole("combobox", { name: "Account" });
  await account.click();
  await page.getByRole("option", { name: /Savings •••• 8911/ }).click();
  await expect(page.getByText("Showing 2 of 2")).toBeVisible();

  const calls = await apiCalls();
  const refresh = calls.indexOf("200 /api/auth/refresh-token");
  expect(refresh).toBeGreaterThan(0);
  // Requests sent with the expired token were refused...
  expect(calls.slice(0, refresh)).toContain("401 /api/accounts");
  expect(calls.slice(0, refresh).every((call) => call.startsWith("401 "))).toBe(true);
  // ...one refresh served them all, even though they failed together...
  expect(calls.filter((call) => call.endsWith("/api/auth/refresh-token"))).toHaveLength(1);
  // ...and everything after it succeeded, including the retry.
  expect(calls.slice(refresh + 1)).toContain("200 /api/accounts");
  expect(calls.slice(refresh + 1).every((call) => call.startsWith("200 "))).toBe(true);
  await expectSignedIn(page);
});
