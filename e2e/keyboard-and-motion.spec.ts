import { expect, expectSignedIn, signIn, test } from "./support";

import type { Locator, Page } from "@playwright/test";

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
  // Up to 60 Tab presses on each of seven pages.
  test.slow();
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

/** Presses Tab until `target` has focus, as a keyboard user would. */
async function tabTo(page: Page, target: Locator, maxStops = 50) {
  for (let stop = 0; stop < maxStops; stop++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Tab never reached ${target.toString()}`);
}

async function signInWithKeyboard(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await tabTo(page, page.getByLabel("Username"));
  await page.keyboard.type("demo.jane");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Password123!");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(next);
}

test("login → transfer → receipt → logout with the keyboard alone", async ({ page }) => {
  test.slow();
  await signInWithKeyboard(page, "/transfer");

  await tabTo(page, page.getByLabel("To account number"));
  await page.keyboard.type("2899010846");
  await tabTo(page, page.getByLabel("Amount in ETB"));
  await page.keyboard.type("250");
  await tabTo(
    page,
    page.getByRole("button", { name: /^Send ETB 250\.00$/ }).locator("visible=true"),
  );
  await page.keyboard.press("Enter");

  const review = page.getByRole("dialog", { name: "Review transfer" });
  await expect(review).toBeVisible();
  await tabTo(page, review.getByRole("button", { name: "Confirm and send" }));
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/transfer\/receipt\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Transfer sent" })).toBeFocused();
  await tabTo(page, page.getByRole("link", { name: "Done" }));
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("/");
  await tabTo(page, page.getByRole("button", { name: "Log out" }).locator("visible=true"));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/login");
});

test("paying a bill with the keyboard alone", async ({ page }) => {
  test.slow();
  await signInWithKeyboard(page, "/pay-bill");
  await page.mouse.move(0, 0);

  // Biller: open with Enter, the first biller has focus, Enter picks it.
  await tabTo(page, page.getByRole("combobox", { name: "Biller" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: "Ethio Telecom" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox", { name: "Biller" })).toHaveText(/Ethio Telecom/);

  await tabTo(page, page.getByLabel("Amount in ETB"));
  await page.keyboard.type("120");
  await tabTo(
    page,
    page.getByRole("button", { name: /^Pay ETB 120\.00$/ }).locator("visible=true"),
  );
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/pay-bill\/receipt\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bill paid" })).toBeFocused();
});

test("opening an account with the keyboard alone", async ({ page }) => {
  test.slow();
  await signInWithKeyboard(page, "/accounts/new");

  // Account type is one radio group (Savings, Checking, Money market): Tab lands
  // on the chosen type, arrows move.
  await tabTo(page, page.getByRole("radio", { name: /Savings/ }));
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Checking/ })).toBeChecked();

  await tabTo(page, page.getByLabel("Initial deposit (optional)"));
  await page.keyboard.type("50");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/accounts\/\d+$/);
});
