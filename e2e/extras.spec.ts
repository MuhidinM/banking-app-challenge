import { readFile } from "node:fs/promises";

import { expect, signIn, test } from "./support";

// The small extras of #45, in a real browser with the in-page mock.

test("an offline banner while the connection is down, and a toast when it returns", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await signIn(page);
  await expect(page.getByRole("region", { name: "Total balance" })).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByRole("main")).toContainText("You're offline.");

  await context.setOffline(false);
  await expect(page.getByRole("main")).not.toContainText("You're offline.");
  await expect(page.getByText("You're back online.").first()).toBeVisible();
});

test("the loaded transactions download as CSV", async ({ page }) => {
  await page.goto("/login?next=%2Factivity");
  await signIn(page);
  await expect(page.getByText(/^Showing \d+ of \d+$/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^kifiya-checking-8057-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = await readFile(await download.path(), "utf8");
  const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
  expect(lines[0]).toBe(
    "Date,Reference,Description,Type,Direction,Amount (ETB),Balance after (ETB),Other account",
  );
  expect(lines.length).toBeGreaterThan(1);
});

test("a recent recipient fills in the account number", async ({ page }) => {
  await page.goto("/login?next=%2Ftransfer");
  await signIn(page);

  // Seed: Jane's checking hasn't sent a transfer yet, so send one first.
  await expect(page.getByRole("group", { name: "Recent" })).toHaveCount(0);
  await page.getByLabel("To account number").fill("2899010846");
  await page.getByLabel("Amount in ETB").fill("25");
  await page
    .getByRole("button", { name: /^Send ETB 25\.00$/ })
    .first()
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm and send" }).click();
  await expect(page).toHaveURL(/\/transfer\/receipt\/\d+$/);

  await page.goto("/transfer");
  await page
    .getByRole("group", { name: "Recent" })
    .getByRole("button", { name: "2899 0108 46" })
    .click();
  await expect(page.getByLabel("To account number")).toHaveValue("2899 0108 46");
});
