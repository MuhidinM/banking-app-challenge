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

import { AccountsList } from "./accounts-list";

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AccountsList />
    </QueryClientProvider>,
  );
}

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 50,
  number: 0,
  numberOfElements: 0,
  first: true,
  last: true,
  empty: true,
};

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("AccountsList", () => {
  it("shows the count, the total and every account with type, masked number and balance", async () => {
    renderList();

    expect(screen.getByRole("heading", { level: 1, name: "My accounts" })).toBeInTheDocument();
    expect(await screen.findByText("2 accounts · ETB 10,840.00 total")).toBeInTheDocument();

    const rows = within(screen.getByRole("list", { name: "Your accounts" })).getAllByRole("link");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Checking•••• 8057ETB 8,640.00Available");
    expect(rows[0]).toHaveAttribute("href", "/accounts/1");
    expect(rows[1]).toHaveTextContent("Savings•••• 8911ETB 2,200.00Available");
  });

  it("lists every account, beyond the first page", async () => {
    addAccounts(
      "demo.jane",
      Array.from({ length: 58 }, () => 10),
    );
    renderList();

    expect(await screen.findByText("60 accounts · ETB 11,420.00 total")).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Your accounts" })).getAllByRole("link"),
    ).toHaveLength(60);
  });

  it("links New and the dashed row to opening an account", async () => {
    renderList();

    expect(screen.getByRole("link", { name: "New" })).toHaveAttribute("href", "/accounts/new");
    expect(await screen.findByRole("link", { name: /Open another account/ })).toHaveAttribute(
      "href",
      "/accounts/new",
    );
  });

  it("shows an empty state with a way to open the first account", async () => {
    server.use(http.get(apiUrl("/api/accounts"), () => HttpResponse.json(emptyPage)));
    renderList();

    expect(await screen.findByText("No accounts yet")).toBeInTheDocument();
    expect(screen.getByText("0 accounts · ETB 0.00 total")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open an account" })).toHaveAttribute(
      "href",
      "/accounts/new",
    );
    expect(screen.queryByRole("link", { name: /Open another account/ })).toBeNull();
  });

  it("shows an error with a retry", async () => {
    let fail = true;
    server.use(
      http.get(apiUrl("/api/accounts"), ({ request }) =>
        fail ? apiError(500, "GEN_001", "Internal error", request) : undefined,
      ),
    );
    renderList();

    expect(await screen.findByText("We couldn't load your accounts")).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("2 accounts · ETB 10,840.00 total")).toBeInTheDocument();
  });
});
