import { expect, signIn, test } from "./support";

import type { Page } from "@playwright/test";

const WIDTHS = [360, 390, 768, 1024, 1440];

/**
 * Puts extreme values into the in-page mock's saved bank (`kb-mock-api`),
 * which it loads on the next page: a very long name and email, a balance of
 * ETB 99,999,999,999.99, a long description and one with no spaces at all.
 */
async function plantLongValues(page: Page) {
  await page.evaluate(() => {
    const saved = localStorage.getItem("kb-mock-api");
    if (!saved) throw new Error("The mock hasn't saved its bank yet.");
    const bank = JSON.parse(saved) as {
      db: {
        users: { username: string; firstName: string; lastName: string; email: string }[];
        accounts: { id: number; balanceCents: number }[];
        transactions: { id: number; description: string; amountCents: number }[];
      };
    };
    const jane = bank.db.users.find((user) => user.username === "demo.jane");
    const checking = bank.db.accounts.find((account) => account.id === 1);
    const refund = bank.db.transactions.find((row) => row.id === 13);
    const fee = bank.db.transactions.find((row) => row.id === 12);
    if (!jane || !checking || !refund || !fee) throw new Error("Seed data changed.");
    jane.firstName = "Wolde-Giyorgis";
    jane.lastName = "Habtemariam-Tekle";
    jane.email = "wolde.giyorgis.habtemariam.tekle.longaddress@example-company-mail.com";
    checking.balanceCents = 9_999_999_999_999;
    refund.description =
      "Refund from Ethiopian Electric Utility for the overcharged prepaid meter top-up in Bole sub-city, reference 2026/09/30-AB-0098812";
    refund.amountCents = 123_456_789_012;
    fee.description = "Unbroken-description-without-any-spaces-at-all-0123456789-0123456789";
    localStorage.setItem("kb-mock-api", JSON.stringify(bank));
  });
}

/**
 * What doesn't fit: the page scrolling sideways, anything past the right
 * edge, and controls whose tap area (including a `hit-area` box) is under
 * 44 x 44 px (UI spec: min hit 44, N-019).
 */
async function layoutProblems(page: Page) {
  return page.evaluate(() => {
    const problems = new Set<string>();
    const viewport = document.documentElement.clientWidth;
    const describe = (element: Element) =>
      `<${element.tagName.toLowerCase()}> "${(element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 30)}"`;

    if (document.documentElement.scrollWidth > viewport) {
      problems.add(`scrolls sideways: ${document.documentElement.scrollWidth} > ${viewport}`);
    }
    for (const element of document.querySelectorAll("body *")) {
      const box = element.getBoundingClientRect();
      if (box.width > 0 && box.right > viewport + 0.5) {
        problems.add(`past the right edge: ${describe(element)}`);
      }
    }

    const controls = document.querySelectorAll<HTMLElement>(
      "a[href], button, [role=combobox], input:not([type=hidden]), textarea",
    );
    for (const control of controls) {
      // A field's tap area is its frame; a visually hidden radio's is its label.
      const target =
        control.closest(".focus-control") ??
        (control.matches("input[type=radio], input[type=checkbox]")
          ? control.closest("label")
          : control);
      if (!target) continue;
      const box = target.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const after = getComputedStyle(target, "::after");
      const extra = after.position === "absolute" && after.content !== "none";
      const width = Math.max(box.width, extra ? parseFloat(after.width) || 0 : 0);
      const height = Math.max(box.height, extra ? parseFloat(after.height) || 0 : 0);
      if (width < 43.5 || height < 43.5) {
        problems.add(`tap area ${Math.round(width)}x${Math.round(height)}: ${describe(control)}`);
      }
    }
    return [...problems];
  });
}

for (const width of WIDTHS) {
  test(`fits ${width} px with long values, and every tap area is 44 px`, async ({ page }) => {
    // Eleven views, each loaded and measured: more than the default 30 s on a busy machine.
    test.slow();
    await page.setViewportSize({ width, height: 900 });

    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await layoutProblems(page), path).toEqual([]);
    }

    await page.goto("/login");
    await signIn(page);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
    await plantLongValues(page);

    const pages = [
      "/",
      "/accounts",
      "/accounts/new",
      "/accounts/1",
      "/activity?account=1",
      "/profile",
      "/transfer",
      "/pay-bill",
      // Receipts: Jane's seed has transfer 11 coming in (John's ETB 300.00).
      "/transfer/receipt/11",
      // Jane's seed has bill payment 9 (Ethio Telecom, ETB 235.00).
      "/pay-bill/receipt/9",
    ];
    for (const path of pages) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.getByRole("main").getByRole("status")).toHaveCount(0);
      expect(await layoutProblems(page), path).toEqual([]);
    }

    // The details dialog (a sheet on phones) with the long title and amount.
    for (const tx of [13, 12]) {
      await page.goto(`/activity?account=1&tx=${tx}`);
      await expect(page.getByRole("dialog")).toContainText(`TX-0000${tx}`);
      expect(await layoutProblems(page), `details ${tx}`).toEqual([]);
    }
  });
}

test("a normal balance keeps the designed size; a huge one shrinks to fit", async ({ page }) => {
  // 390 px is the mobile design's width: the total is drawn at 36 px there.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/login");
  await signIn(page);
  const total = page.getByText(/^ETB 10,840\.00$/);
  await expect(total).toBeVisible();
  expect(await total.evaluate((element) => getComputedStyle(element).fontSize)).toBe("36px");

  await plantLongValues(page);
  await page.reload();
  const huge = page.getByText(/^ETB 100,000,002,199\.99$/);
  await expect(huge).toBeVisible();
  const size = await huge.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(size).toBeLessThan(36);
  expect(size).toBeGreaterThan(16);
});

// The longest values the forms accept, going through every screen that shows
// them: a 140-character note (the API's limit; it becomes the transaction's
// description) and an 80-character biller name typed under "Other".
const LONG_NOTE =
  "Rent-and-utilities-for-September-2026-apartment-4B-Bole-sub-city-Addis-Ababa-paid-in-full-including-water-electricity-and-internet-thanks";
const LONG_BILLER =
  "Addis Ababa City Administration Housing Development and Administration Bureau 07";

for (const width of [360, 1440]) {
  test(`a ${LONG_NOTE.length}-character note fits at ${width} px from review to history`, async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login?next=%2Ftransfer");
    await signIn(page);

    await page.getByLabel("To account number").fill("2899010846");
    await page.getByLabel("Amount in ETB").fill("25");
    await page.getByLabel("Note (optional)").fill(LONG_NOTE);
    await page
      .getByRole("button", { name: /^Send ETB 25\.00$/ })
      .first()
      .click();
    const review = page.getByRole("dialog", { name: "Review transfer" });
    await expect(review).toContainText("Note");
    expect(await layoutProblems(page), "review").toEqual([]);

    await review.getByRole("button", { name: "Confirm and send" }).click();
    await expect(page).toHaveURL(/\/transfer\/receipt\/(\d+)$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await layoutProblems(page), "receipt").toEqual([]);
    const id = /(\d+)$/.exec(page.url())?.[1];

    await page.goto(`/activity?account=1&tx=${id}`);
    await expect(page.getByRole("dialog")).toContainText(LONG_NOTE.slice(0, 20));
    expect(await layoutProblems(page), "details").toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await layoutProblems(page), "history").toEqual([]);
  });

  test(`an ${LONG_BILLER.length}-character biller fits at ${width} px from the form to the receipt`, async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login?next=%2Fpay-bill");
    await signIn(page);

    await page.mouse.move(0, 0);
    await page.getByRole("combobox", { name: "Biller" }).click();
    await page.getByRole("option", { name: "Other" }).click();
    await page.getByLabel("Biller name").fill(LONG_BILLER);
    await page.getByLabel("Amount in ETB").fill("45");
    expect(await layoutProblems(page), "form and summary").toEqual([]);

    await page
      .getByRole("button", { name: /^Pay ETB 45\.00$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/pay-bill\/receipt\/\d+$/);
    await expect(page.getByRole("main")).toContainText(LONG_BILLER);
    expect(await layoutProblems(page), "receipt").toEqual([]);

    await page.goto("/activity?account=1");
    await expect(page.getByText(/^Showing \d+ of \d+$/)).toBeVisible();
    expect(await layoutProblems(page), "history").toEqual([]);
  });
}
