import { expect, signIn, test } from "./support";

// The whole transfer, in a real browser with the in-page mock: details, review,
// receipt, a reload of the receipt, and the new balance on the dashboard.
test("a transfer from the form to a receipt that survives a reload", async ({ page }) => {
  await page.goto("/login?next=%2Ftransfer");
  await signIn(page);

  await page.getByLabel("To account number").fill("2899010846");
  await page.getByLabel("Amount in ETB").fill("250");
  await page.getByLabel("Note (optional)").fill("Rent for September");
  await page
    .getByRole("button", { name: /^Send ETB 250\.00$/ })
    .first()
    .click();

  const review = page.getByRole("dialog", { name: "Review transfer" });
  await expect(review).toContainText("Transfers are instant and cannot be reversed.");
  await review.getByRole("button", { name: "Confirm and send" }).dblclick();

  await expect(page).toHaveURL(/\/transfer\/receipt\/\d+$/);
  const receipt = page.getByRole("main");
  await expect(receipt.getByRole("heading", { level: 1, name: "Transfer sent" })).toBeVisible();
  await expect(receipt).toContainText("ETB 250.00 to 2899010846");
  await expect(receipt).toContainText(/TX-\d{6}/);
  await expect(receipt).toContainText("ETB 8,390.00");

  await page.reload();
  await expect(page.getByRole("main")).toContainText("ETB 250.00 to 2899010846");

  await page.getByRole("link", { name: "Done" }).click();
  await expect(page.getByRole("region", { name: "Total balance" })).toContainText("ETB 10,590.00");
});

test("an unknown recipient comes back on the recipient field", async ({ page }) => {
  await page.goto("/login?next=%2Ftransfer");
  await signIn(page);

  await page.getByLabel("To account number").fill("1234567890");
  await page.getByLabel("Amount in ETB").fill("100");
  await page
    .getByRole("button", { name: /^Send ETB 100\.00$/ })
    .first()
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm and send" }).click();

  const recipient = page.getByLabel("To account number");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Account not found. Check the number.")).toBeVisible();
  await expect(recipient).toBeFocused();
  await expect(recipient).toHaveValue("1234 5678 90");
});

test("more than the balance says Insufficient funds and doesn't open the review", async ({
  page,
}) => {
  await page.goto("/login?next=%2Ftransfer");
  await signIn(page);

  await page.getByLabel("To account number").fill("2899010846");
  const amount = page.getByLabel("Amount in ETB");
  await amount.fill("9000");
  await expect(page.getByText("Insufficient funds. Available: ETB 8,640.00.")).toBeVisible();

  await page
    .getByRole("button", { name: /^Send ETB 9,000\.00$/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(amount).toBeFocused();
});

test("sending to the same account says so on the recipient field", async ({ page }) => {
  await page.goto("/login?next=%2Ftransfer");
  await signIn(page);

  // Jane's Checking is the default From account.
  const recipient = page.getByLabel("To account number");
  await recipient.fill("8751138057");
  await page.getByLabel("Amount in ETB").fill("100");
  await page
    .getByRole("button", { name: /^Send ETB 100\.00$/ })
    .first()
    .click();

  await expect(page.getByText("Cannot transfer to the same account.")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(recipient).toBeFocused();
});
