import { expect, expectSignedIn, signIn, test } from "./support";

import type { Page } from "@playwright/test";

/**
 * Tabs through the page and returns every stop that shows no focus indicator:
 * buttons and links draw a 2px accent outline (theirs or their label's, for
 * visually hidden radios); fields light up their `focus-control` frame.
 */
async function stopsWithoutFocusIndicator(page: Page, maxStops = 60) {
  await page.locator("body").focus();
  const missing: string[] = [];
  const seen = new Set<string>();
  for (let stop = 0; stop < maxStops; stop++) {
    await page.keyboard.press("Tab");
    const result = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      const outlined = (node: Element | null) => {
        if (!node) return false;
        const style = getComputedStyle(node);
        return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      };
      const frame = element.closest(".focus-control");
      const ringed = frame !== null && getComputedStyle(frame).boxShadow !== "none";
      const label =
        element.getAttribute("aria-label") ??
        element.textContent?.trim().slice(0, 40) ??
        element.tagName;
      const key = `${element.tagName}:${label}:${element.getBoundingClientRect().top}`;
      return {
        key,
        description: `${element.tagName.toLowerCase()} "${label}"`,
        visible: outlined(element) || outlined(element.closest("label")) || ringed,
      };
    });
    if (!result || seen.has(result.key)) break;
    seen.add(result.key);
    if (!result.visible) missing.push(result.description);
  }
  return { missing, stops: seen.size };
}

test("every tab stop shows where focus is", async ({ page }) => {
  await page.goto("/login");
  const login = await stopsWithoutFocusIndicator(page);
  expect(login.missing, "/login").toEqual([]);

  await signIn(page);
  await expectSignedIn(page);
  for (const path of [
    "/",
    "/accounts",
    "/accounts/new",
    "/activity?account=1",
    "/profile",
    "/pay-bill",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectSignedIn(page);
    const { missing, stops } = await stopsWithoutFocusIndicator(page);
    expect(stops, path).toBeGreaterThan(3);
    expect(missing, path).toEqual([]);
  }
});

test("the history works with the keyboard alone", async ({ page }) => {
  await page.goto("/login?next=%2Factivity%3Faccount%3D1");
  await page.getByLabel("Username").focus();
  await page.keyboard.type("demo.jane");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Password123!");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Showing 10 of 13")).toBeVisible();

  // The skip link comes first and lands in the main content.
  await page.locator("body").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /skip to/i })).toBeFocused();
  await page.keyboard.press("Enter");

  // Account select: open with Enter, choose with the arrows. The mouse is moved
  // out of the way first: Radix highlights whatever option opens under a resting
  // pointer, which a keyboard-only user doesn't have.
  await page.mouse.move(0, 0);
  const account = page.getByRole("combobox", { name: "Account" });
  await account.focus();
  await page.keyboard.press("Enter");
  // Each key waits for the list to be ready for it: an ArrowDown sent while
  // the list is still opening is lost (it failed about 1 run in 5).
  await expect(page.getByRole("option", { name: /Checking/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: /Savings/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/account=2/);
  await expect(account).toBeFocused();
  await expect(page.getByText("Showing 2 of 2")).toBeVisible();

  // Filter pills are one radio group: Tab in, arrows to move.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: "All" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Money in" })).toBeChecked();
  await expect(page).toHaveURL(/direction=CREDIT/);

  // Rows are buttons: Tab to the first, Enter opens its details, Escape
  // closes them and focus goes back to the row.
  await page.keyboard.press("Tab");
  const row = page.getByRole("main").getByRole("listitem").getByRole("button").first();
  await expect(row).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Transaction" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(row).toBeFocused();
});

for (const reducedMotion of ["reduce", "no-preference"] as const) {
  test(`the details dialog ${reducedMotion === "reduce" ? "doesn't animate" : "animates"} with reduced motion ${reducedMotion === "reduce" ? "on" : "off"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/login?next=%2Factivity%3Faccount%3D1");
    await signIn(page);
    await expect(page.getByText("Showing 10 of 13")).toBeVisible();

    await page.getByRole("main").getByRole("listitem").getByRole("button").first().click();
    const dialog = page.getByRole("dialog", { name: "Transaction" });
    await expect(dialog).toBeVisible();

    // The computed name stays after the 160 ms animation ends, so this can't race it.
    const animationName = await dialog.evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    expect(animationName).toBe(reducedMotion === "reduce" ? "none" : "kb-dialog-in");
  });
}
