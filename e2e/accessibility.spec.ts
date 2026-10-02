import AxeBuilder from "@axe-core/playwright";

import { expect, signIn, test } from "./support";

import type { Page } from "@playwright/test";

// WCAG 2.2 A and AA rules. Colour contrast is left out: the spec's own tokens
// fail some pairs by decision (N-016), and scripts/design-contrast.test.ts pins them.
async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .disableRules(["color-contrast"])
    .analyze();
  return violations.map(({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(", ")}`);
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const path of ["/login", "/register"]) {
    test(`${path} has no accessibility violations (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const { device, width } of [
    { device: "desktop", width: 1440 },
    { device: "phone", width: 375 },
  ]) {
    test(`the signed-in pages have no accessibility violations (${colorScheme}, ${device})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await signIn(page);
      // Wait for the sign-in to finish: navigating earlier would land back on
      // /login and check that page instead.
      await expect(page).toHaveURL("/");
      for (const path of [
        "/",
        "/accounts",
        "/accounts/new",
        "/activity",
        "/profile",
        "/pay-bill",
      ]) {
        await page.goto(path);
        await expect(page).toHaveURL(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        // Loaded: no skeletons left (each loading region is a status).
        await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
        expect(await violations(page), path).toEqual([]);
      }
    });
  }
}

test("the transaction details dialog has no accessibility violations", async ({ page }) => {
  await page.goto("/login?next=%2Factivity%3Faccount%3D1%26tx%3D13");
  await signIn(page);
  await expect(page.getByRole("dialog", { name: "Transaction" })).toContainText("TX-000013");
  expect(await violations(page)).toEqual([]);
});
