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
  // Let the dashboard finish loading, so no request from before the clock
  // jump is still on its way and gets recorded.
  await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);

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
  // Checking's history is cached from the dashboard and now stale, so the
  // Activity page asks for it again, with the expired token.
  await page.getByRole("link", { name: "Activity" }).first().click();
  await expect(page.getByText("Showing 10 of 13")).toBeVisible();
  // The cached rows show at once; the refetch runs behind them.
  await expect.poll(apiCalls).toContain("200 /api/transactions/1");

  const calls = await apiCalls();
  const refresh = calls.indexOf("200 /api/auth/refresh-token");
  expect(refresh, calls.join(", ")).toBeGreaterThan(0);
  // The request was refused (and any sent alongside it)...
  expect(calls.slice(0, refresh)).toContain("401 /api/transactions/1");
  expect(calls.slice(0, refresh).every((call) => call.startsWith("401 "))).toBe(true);
  // ...one refresh served them all...
  expect(calls.filter((call) => call.endsWith("/api/auth/refresh-token"))).toHaveLength(1);
  // ...and the same request was retried with the new token and succeeded.
  expect(calls.slice(refresh + 1)).toContain("200 /api/transactions/1");
  expect(calls.slice(refresh + 1).every((call) => call.startsWith("200 "))).toBe(true);
  await expectSignedIn(page);
});
