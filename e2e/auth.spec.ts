import { expect, expectSignedIn, signIn, test } from "./support";

test.describe("signing in", () => {
  test("a wrong password shows an error and stays on the login page", async ({ page }) => {
    await page.goto("/login");
    await signIn(page, { password: "not-the-password" });

    await expect(page.getByText("Username or password is incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
  });

  test("the right password opens the dashboard", async ({ page }) => {
    await page.goto("/login");
    await signIn(page);

    await expect(page).toHaveURL(/\/$/);
    await expectSignedIn(page);
  });
});

test("registering opens the account and signs the new customer in", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Register" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  await page.getByLabel("First name").fill("Abebe");
  await page.getByLabel("Last name").fill("Kebede");
  await page.getByLabel("Username").fill("abebe.kebede");
  await page.getByLabel("Phone number").fill("+251 911 234 567");
  await page.getByLabel("Password", { exact: true }).fill("Secret123!");
  await page.getByLabel("Confirm password").fill("Secret123!");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByText("Welcome, Abebe. Your account is ready.", { exact: true }),
  ).toBeVisible();
  await expectSignedIn(page, "Abebe Kebede");
});

test.describe("route protection", () => {
  test("a signed-out visitor goes to login and comes back to the page they asked for", async ({
    page,
  }) => {
    await page.goto("/activity?direction=out");
    await expect(page).toHaveURL("/login?next=%2Factivity%3Fdirection%3Dout");

    await signIn(page);
    await expect(page).toHaveURL("/activity?direction=out");
    await expectSignedIn(page);
  });

  test("a next that leaves the site is ignored", async ({ page }) => {
    await page.goto("/login?next=%2F%2Fevil.example");
    await signIn(page);
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });

  test("a signed-in user is sent away from the login page", async ({ page }) => {
    await page.goto("/login");
    await signIn(page);
    await expectSignedIn(page);

    await page.goto("/login?next=%2Fprofile");
    await expect(page).toHaveURL("/profile");
  });
});

test.describe("the session", () => {
  test("survives a reload", async ({ page }) => {
    await page.goto("/login?next=%2Fprofile");
    await signIn(page);
    await expect(page).toHaveURL("/profile");

    await page.reload();
    await expect(page).toHaveURL("/profile");
    await expectSignedIn(page);
  });

  test("logging out returns to login and protects the app again", async ({ page }) => {
    await page.goto("/login");
    await signIn(page);
    await expectSignedIn(page);

    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page).toHaveURL("/login");

    await page.goto("/accounts");
    await expect(page).toHaveURL("/login?next=%2Faccounts");
  });

  test("logging out in one tab logs out the other", async ({ context, page }) => {
    await page.goto("/login");
    await signIn(page);
    await expectSignedIn(page);

    const other = await context.newPage();
    await other.goto("/profile");
    await expectSignedIn(other);

    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page).toHaveURL("/login");
    await expect(other).toHaveURL("/login");
  });
});
