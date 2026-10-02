import { expect, signIn, test } from "./support";

// A bill payment in a real browser with the in-page mock: the form with its
// insufficient-funds state, Pay, the receipt, a reload of the receipt, and
// the new balance on the dashboard.
test("a bill payment from the form to a receipt that survives a reload", async ({ page }) => {
  await page.goto("/login?next=%2Fpay-bill");
  await signIn(page);

  await page.getByRole("combobox", { name: "Biller" }).click();
  await page.getByRole("option", { name: "Ethio Telecom" }).click();
  const amount = page.getByLabel("Amount in ETB");
  const pay = page.getByRole("button", { name: /^Pay / }).first();

  await amount.fill("9000");
  await expect(page.getByText("Insufficient funds. Available: ETB 8,640.00.")).toBeVisible();
  await expect(pay).toBeDisabled();

  await amount.fill("240");
  await expect(pay).toBeEnabled();
  await pay.dblclick();

  await expect(page).toHaveURL(/\/pay-bill\/receipt\/\d+$/);
  const receipt = page.getByRole("main");
  await expect(receipt.getByRole("heading", { level: 1, name: "Bill paid" })).toBeVisible();
  await expect(receipt).toContainText("ETB 240.00 to Ethio Telecom");
  await expect(receipt).toContainText(/TX-\d{6}/);
  await expect(receipt).toContainText("ETB 8,400.00");

  await page.reload();
  await expect(page.getByRole("main")).toContainText("ETB 240.00 to Ethio Telecom");

  await page.getByRole("link", { name: "Done" }).click();
  await expect(page.getByRole("region", { name: "Total balance" })).toContainText("ETB 10,600.00");
});
