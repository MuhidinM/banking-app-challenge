import { expect, signIn, test } from "./support";

// Seed: Jane has Checking •••• 8057 and Savings •••• 8911.

test("opening an account goes to it and adds it to the list", async ({ page }) => {
  await page.goto("/login?next=%2Faccounts%2Fnew");
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Open an account" })).toBeVisible();

  // The radio is visually hidden inside its card; click the card as a user would.
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: /Checking/ }) })
    .click();
  await expect(page.getByRole("radio", { name: /Checking/ })).toBeChecked();
  await page.getByLabel("Initial deposit (optional)").fill("250.50");
  await page.getByRole("button", { name: "Open account" }).click();

  await expect(page).toHaveURL(/\/accounts\/\d+$/);

  // The account details page (#32) isn't built yet, so go to the list
  // directly; the mock keeps the new account across the page load.
  await page.goto("/accounts");
  const accounts = page.getByRole("list", { name: "Your accounts" }).getByRole("link");
  await expect(accounts).toHaveCount(3);
  await expect(accounts.filter({ hasText: "ETB 250.50" })).toHaveCount(1);
});
