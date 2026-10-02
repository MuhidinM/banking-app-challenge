import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { fakeNavigation } from "@/test/fake-navigation";

import { AccountActivity } from "./account-activity";
import { readDirectionParam } from "./direction-filter";

vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).navigationModule);

// Seed: Jane's Checking •••• 8057 (id 1, 13 rows, both directions) and
// Savings •••• 8911 (id 2, two deposits: money in only).
function renderActivity(href: string) {
  fakeNavigation.reset(href);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AccountActivity />
    </QueryClientProvider>,
  );
}

const rowNames = () =>
  screen.getAllByRole("listitem").map((row) => row.querySelector(".sr-only")?.textContent ?? "");

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("Activity page", () => {
  it("shows the first account when the URL names none", async () => {
    renderActivity("/activity");

    expect(await screen.findByRole("combobox", { name: "Account" })).toHaveTextContent(
      "Checking •••• 8057",
    );
    expect(await screen.findByText("Showing 10 of 13")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All" })).toBeChecked();
  });

  it("filters by direction through the URL, and Back undoes it", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1");
    await screen.findByText("Showing 10 of 13");

    await user.click(screen.getByRole("radio", { name: "Money out" }));

    expect(fakeNavigation.href).toBe("/activity?account=1&direction=DEBIT");
    expect(rowNames().length).toBeGreaterThan(0);
    expect(rowNames().every((name) => name.includes("Money out"))).toBe(true);

    fakeNavigation.router.back();

    await waitFor(() => expect(screen.getByRole("radio", { name: "All" })).toBeChecked());
    expect(rowNames().some((name) => name.includes("Money in"))).toBe(true);
  });

  it("keeps the filter after a reload", async () => {
    renderActivity("/activity?account=1&direction=CREDIT");

    await screen.findByText("Showing 10 of 13");
    expect(screen.getByRole("radio", { name: "Money in" })).toBeChecked();
    expect(rowNames().every((name) => name.includes("Money in"))).toBe(true);
  });

  it("switches account, keeping the filter", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1&direction=CREDIT");
    await screen.findByText("Showing 10 of 13");

    await user.click(screen.getByRole("combobox", { name: "Account" }));
    await user.click(await screen.findByRole("option", { name: /Savings •••• 8911/ }));

    expect(fakeNavigation.href).toBe("/activity?account=2&direction=CREDIT");
    expect(await screen.findByText("Showing 2 of 2")).toBeInTheDocument();
  });

  it("says so when the filter matches nothing", async () => {
    renderActivity("/activity?account=2&direction=DEBIT");

    expect(await screen.findByText("No money out")).toBeInTheDocument();
    expect(screen.getByText("None in this account's history.")).toBeInTheDocument();
  });

  it("names the account in the transaction details", async () => {
    renderActivity("/activity?account=1&tx=13");

    const dialog = await screen.findByRole("dialog", { name: "Transaction" });
    const term = await within(dialog).findByText("Account", { selector: "dt" });
    expect(term.nextElementSibling).toHaveTextContent("Checking •••• 8057");
  });

  it("doesn't load another customer's account from the URL", async () => {
    renderActivity("/activity?account=3");

    expect(await screen.findByText("We couldn't find this account.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Account" })).toHaveTextContent(
      "Choose an account",
    );
  });

  it("points to opening an account when there are none", async () => {
    server.use(
      http.get(apiUrl("/api/accounts"), () =>
        HttpResponse.json({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 50,
          number: 0,
          numberOfElements: 0,
          first: true,
          last: true,
          empty: true,
        }),
      ),
    );
    renderActivity("/activity");

    expect(await screen.findByRole("link", { name: "Open an account" })).toHaveAttribute(
      "href",
      "/accounts/new",
    );
  });
});

describe("readDirectionParam", () => {
  it.each([
    ["CREDIT", "CREDIT"],
    ["DEBIT", "DEBIT"],
    [null, "all"],
    ["credit", "all"],
    ["SIDEWAYS", "all"],
  ])("%s → %s", (value, expected) => {
    expect(readDirectionParam(value)).toBe(expected);
  });
});
