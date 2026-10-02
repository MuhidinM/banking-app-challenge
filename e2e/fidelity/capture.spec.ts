import { signIn, test } from "../support";

import type { Page } from "@playwright/test";

/**
 * Screenshots for the design fidelity report (docs/fidelity.md), one per
 * frame of the UI spec, in the state the frame shows, at the spec's sizes
 * (web 1440×900, mobile 390×844), in light and dark. Each file is named after
 * its frame, e.g. `web-WebDashboard.png` and `mobile-MainDark.png`.
 *
 * Not part of `pnpm e2e`; run `pnpm fidelity` to refresh them.
 */

interface Frame {
  /** The spec frame's names: web and/or mobile. */
  web?: string;
  mobile?: string;
  /** Where to start, signed out; most frames sign in on the way. */
  url: string;
  signIn?: boolean;
  /** Brings the page into the frame's state. */
  setup?: (page: Page) => Promise<void>;
}

const sendRent = async (page: Page) => {
  await page.getByLabel("To account number").fill("2899010846");
  await page.getByLabel("Amount in ETB").fill("250");
  await page.getByLabel("Amount in ETB").blur();
};

const FRAMES: Frame[] = [
  {
    web: "WebLogin",
    mobile: "Login",
    url: "/login?reason=expired",
    setup: (page) => page.getByText("Your session expired.").waitFor(),
  },
  {
    web: "WebRegister",
    mobile: "Register",
    url: "/register",
    setup: async (page) => {
      // The frame: everything valid but a short password, after Register.
      await page.getByLabel("First name").fill("Jane");
      await page.getByLabel("Last name").fill("Doe");
      await page.getByLabel("Username").fill("jane.doe");
      await page.getByLabel("Phone number").fill("+251911234567");
      await page.getByLabel("Password", { exact: true }).fill("pass");
      const confirm = page.getByLabel(/^Confirm password/);
      if (await confirm.count()) await confirm.fill("pass");
      await page.getByRole("button", { name: "Register" }).click();
      await page.getByText("Password must be at least 6 characters.").waitFor();
    },
  },
  { web: "WebDashboard", mobile: "Main", url: "/login", signIn: true },
  { mobile: "Accounts", url: "/login?next=%2Faccounts", signIn: true },
  {
    web: "WebNewAccount",
    mobile: "NewAccount",
    url: "/login?next=%2Faccounts%2Fnew",
    signIn: true,
  },
  {
    web: "WebAccountDetail",
    mobile: "AccountDetail",
    url: "/login?next=%2Faccounts%2F1",
    signIn: true,
  },
  { mobile: "Transactions", url: "/login?next=%2Factivity", signIn: true },
  {
    web: "WebTransactionDetail",
    mobile: "TransactionDetail",
    // Seed: transaction 13 is the "Refund from merchant" the frame shows.
    url: "/login?next=%2Faccounts%2F1%3Ftx%3D13",
    signIn: true,
    setup: (page) => page.getByRole("dialog").waitFor(),
  },
  {
    web: "WebTransfer",
    mobile: "Transfer",
    url: "/login?next=%2Ftransfer",
    signIn: true,
    setup: sendRent,
  },
  {
    web: "WebTransferReview",
    mobile: "TransferReview",
    url: "/login?next=%2Ftransfer",
    signIn: true,
    setup: async (page) => {
      await sendRent(page);
      await page.getByLabel("Note (optional)").fill("Rent for September");
      await page.getByRole("button", { name: "Send ETB 250.00" }).first().click();
      await page.getByRole("dialog", { name: "Review transfer" }).waitFor();
    },
  },
  {
    mobile: "TransferSuccess",
    url: "/login?next=%2Ftransfer",
    signIn: true,
    setup: async (page) => {
      await sendRent(page);
      await page.getByRole("button", { name: "Send ETB 250.00" }).first().click();
      await page.getByRole("button", { name: "Confirm and send" }).click();
      await page.waitForURL(/\/transfer\/receipt\/\d+$/);
      await page.getByRole("heading", { name: "Transfer sent" }).waitFor();
    },
  },
  {
    web: "WebPayBill",
    mobile: "PayBill",
    url: "/login?next=%2Fpay-bill",
    signIn: true,
    setup: async (page) => {
      await page.getByRole("combobox", { name: "Biller" }).click();
      await page.getByRole("option", { name: "Ethio Telecom" }).click();
      await page.getByLabel("Amount in ETB").fill("9000");
      await page.getByLabel("Amount in ETB").blur();
      await page
        .getByText(/^Insufficient funds\./)
        .first()
        .waitFor();
    },
  },
  { web: "WebProfile", mobile: "Profile", url: "/login?next=%2Fprofile", signIn: true },
];

const SIZES = {
  web: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

for (const theme of ["light", "dark"] as const) {
  for (const size of ["web", "mobile"] as const) {
    for (const frame of FRAMES) {
      const name = frame[size];
      if (!name) continue;
      const file = `${size}-${name}${theme === "dark" ? "Dark" : ""}.png`;

      test(file, async ({ page }) => {
        await page.setViewportSize(SIZES[size]);
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.goto(frame.url);
        if (frame.signIn) {
          await signIn(page);
          await page.waitForURL((url) => url.pathname !== "/login");
        }
        await page.getByRole("main").waitFor();
        await frame.setup?.(page);
        // Skeletons and fonts settle before the picture.
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `docs/fidelity/${file}`, animations: "disabled" });
      });
    }
  }
}
