import { expect, signIn, test } from "./support";

import type { Page } from "@playwright/test";

// Seed (src/mocks/fixtures.ts): Jane's Checking •••• 8057 (account 1) has 13
// transactions, newest "Refund from merchant" (id 13); Savings •••• 8911
// (account 2) has two deposits.

async function openActivity(page: Page, path = "/activity") {
  await page.goto(`/login?next=${encodeURIComponent(path)}`);
  await signIn(page);
  await expect(page.getByText(/^Showing \d+ of \d+$/)).toBeVisible();
}

// Each row is a button named by one sentence: "<title>. Money in, ETB …. <type>, <when>."
const rows = (page: Page) => page.getByRole("main").getByRole("listitem").getByRole("button");
const rowsSaying = (page: Page, words: string) =>
  rows(page).filter({ hasText: new RegExp(`\. ${words}, ETB`) });

test("Load more adds the next page below the first and stops at the end", async ({ page }) => {
  await openActivity(page, "/activity?account=1");
  await expect(page.getByText("Showing 10 of 13")).toBeVisible();
  const firstRow = await rows(page).first().textContent();

  await page.getByRole("button", { name: "Load more" }).click();

  await expect(page.getByText("Showing 13 of 13")).toBeVisible();
  await expect(rows(page)).toHaveCount(13);
  await expect(rows(page).first()).toHaveText(firstRow ?? "");
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
});

test("the direction filter lives in the URL: reload, Back and Forward keep it", async ({
  page,
}) => {
  await openActivity(page, "/activity?account=1");

  await page.getByText("Money out", { exact: true }).click();
  await expect(page).toHaveURL("/activity?account=1&direction=DEBIT");
  await expect(rowsSaying(page, "Money in")).toHaveCount(0);
  await expect(rowsSaying(page, "Money out").first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole("radio", { name: "Money out" })).toBeChecked();
  await expect(rowsSaying(page, "Money in")).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL("/activity?account=1");
  await expect(page.getByRole("radio", { name: "All" })).toBeChecked();
  await expect(rowsSaying(page, "Money in").first()).toBeVisible();

  await page.goForward();
  await expect(page.getByRole("radio", { name: "Money out" })).toBeChecked();
});

test("the account selector switches the history and keeps the filter", async ({ page }) => {
  await openActivity(page, "/activity?direction=CREDIT");
  const account = page.getByRole("combobox", { name: "Account" });
  await expect(account).toContainText("Checking •••• 8057");

  await account.click();
  await page.getByRole("option", { name: /Savings •••• 8911/ }).click();

  await expect(page).toHaveURL("/activity?direction=CREDIT&account=2");
  await expect(page.getByText("Showing 2 of 2")).toBeVisible();
  await expect(rowsSaying(page, "Money in")).toHaveCount(2);
});

test("transaction details open through ?tx=, survive a reload and close with Back", async ({
  page,
}) => {
  await openActivity(page, "/activity?account=1");

  await rows(page).filter({ hasText: "Refund from merchant" }).click();
  const dialog = page.getByRole("dialog", { name: "Transaction" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL("/activity?account=1&tx=13");
  await expect(dialog).toContainText("TX-000013");
  await expect(dialog).toContainText("Checking •••• 8057");

  await page.reload();
  await expect(dialog).toContainText("Refund from merchant");

  // After a reload nothing of ours is behind it in the history, so closing
  // replaces the URL rather than leaving the page.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/activity?account=1");

  await rows(page).filter({ hasText: "Refund from merchant" }).click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL("/activity?account=1");
  await expect(rows(page).filter({ hasText: "Refund from merchant" })).toBeFocused();
});
