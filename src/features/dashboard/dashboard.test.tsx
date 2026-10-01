import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiError, apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { addAccounts } from "@/test/add-accounts";

import { Dashboard } from "./dashboard";
import { greetingFor } from "./greeting";

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Dashboard />
    </QueryClientProvider>,
  );
}

const balanceCard = () => within(screen.getByRole("region", { name: "Total balance" }));

beforeEach(async () => {
  localStorage.clear();
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("Dashboard", () => {
  it("greets the user and shows the total, accounts and recent activity", async () => {
    renderDashboard();

    expect(await screen.findByRole("heading", { level: 1, name: "Jane Doe" })).toBeInTheDocument();
    expect(await balanceCard().findByText("ETB 10,840.00")).toBeInTheDocument();
    expect(balanceCard().getByText("Across 2 accounts")).toBeInTheDocument();

    const accounts = within(screen.getByRole("region", { name: "My accounts" }));
    expect(accounts.getByRole("link", { name: /Checking/ })).toHaveAttribute("href", "/accounts/1");
    expect(accounts.getByText("ETB 8,640.00")).toBeInTheDocument();
    expect(accounts.getByText("ETB 2,200.00")).toBeInTheDocument();

    const activity = within(screen.getByRole("region", { name: "Recent activity" }));
    expect(await activity.findByText("Checking •••• 8057")).toBeInTheDocument();
    expect(await activity.findAllByRole("listitem")).toHaveLength(3);
    expect(activity.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/activity?account=1",
    );
  });

  it("totals every account, not only the first page (more than 10 accounts)", async () => {
    // 2 seed accounts (10,840.00) + 11 more of 100.50 each = 13 accounts.
    addAccounts(
      "demo.jane",
      Array.from({ length: 11 }, () => 100.5),
    );
    renderDashboard();

    expect(await balanceCard().findByText("ETB 11,945.50")).toBeInTheDocument();
    expect(balanceCard().getByText("Across 13 accounts")).toBeInTheDocument();
    // The list stays short; "View all" opens the rest.
    const accounts = within(screen.getByRole("region", { name: "My accounts" }));
    expect(accounts.getAllByRole("listitem")).toHaveLength(3);
  });

  it("hides the balance and remembers it", async () => {
    const user = userEvent.setup();
    renderDashboard();
    await balanceCard().findByText("ETB 10,840.00");

    await user.click(balanceCard().getByRole("button", { name: "Hide balance" }));

    expect(balanceCard().queryByText("ETB 10,840.00")).toBeNull();
    expect(balanceCard().getByText("Hidden")).toBeInTheDocument();
    expect(balanceCard().getByRole("button", { name: "Hide balance" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem("kb-hide-balance")).toBe("1");
  });

  it("offers to open an account when there are none", async () => {
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
    renderDashboard();

    expect(await screen.findByText("No accounts yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open an account" })).toHaveAttribute(
      "href",
      "/accounts/new",
    );
    expect(balanceCard().getByText("ETB 0.00")).toBeInTheDocument();
  });

  it("shows an error with a retry when accounts can't load", async () => {
    let fail = true;
    server.use(
      http.get(apiUrl("/api/accounts"), ({ request }) =>
        fail ? apiError(500, "GEN_001", "Internal error", request) : undefined,
      ),
    );
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText("We couldn't load your accounts")).toBeInTheDocument();
    expect(balanceCard().getByText("We couldn't load your balance.")).toBeInTheDocument();

    fail = false;
    // Both the balance card and the list offer it; they retry the same query.
    const accounts = within(screen.getByRole("region", { name: "My accounts" }));
    await user.click(accounts.getByRole("button", { name: "Try again" }));
    expect(await balanceCard().findByText("ETB 10,840.00")).toBeInTheDocument();
  });

  it("links the quick actions", () => {
    renderDashboard();
    const actions = within(screen.getByRole("navigation", { name: "Quick actions" }));
    expect(actions.getByRole("link", { name: "Transfer" })).toHaveAttribute("href", "/transfer");
    expect(actions.getByRole("link", { name: "Pay bill" })).toHaveAttribute("href", "/pay-bill");
    expect(actions.getByRole("link", { name: "New account" })).toHaveAttribute(
      "href",
      "/accounts/new",
    );
    expect(actions.getByRole("link", { name: "Accounts" })).toHaveAttribute("href", "/accounts");
  });
});

describe("greetingFor", () => {
  it.each([
    [0, "Good morning"],
    [11, "Good morning"],
    [12, "Good afternoon"],
    [16, "Good afternoon"],
    [17, "Good evening"],
    [23, "Good evening"],
  ])("%i:00 → %s", (hour, greeting) => {
    expect(greetingFor(new Date(2026, 9, 1, hour, 30))).toBe(greeting);
  });
});
