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

for (const path of ["/login", "/register"]) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
}

test("the signed-in pages have no accessibility violations", async ({ page }) => {
  await page.goto("/login");
  await signIn(page);
  for (const path of ["/", "/accounts", "/activity", "/profile"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await violations(page), path).toEqual([]);
  }
});
