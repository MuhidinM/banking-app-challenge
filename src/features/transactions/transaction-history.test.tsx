import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import type { Page, Transaction } from "@/shared/api/types";

import { flattenHistory } from "./queries";
import { TransactionHistory } from "./transaction-history";

// Seed: account 1 is Jane's checking (13 rows), account 5 is demo.empty's.
const JANE_CHECKING = 1;
const EMPTY_ACCOUNT = 5;

function renderHistory(accountId: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TransactionHistory accountId={accountId} />
    </QueryClientProvider>,
  );
}

const rows = () =>
  within(screen.getByRole("list", { name: "Transactions" })).getAllByRole("listitem");

async function signIn(username = "demo.jane") {
  await getAppSession().signIn({ username, passwordHash: DEMO_PASSWORD });
}

describe("TransactionHistory", () => {
  beforeEach(() => signIn());

  it("shows a loading state, then the first page with a count", async () => {
    renderHistory(JANE_CHECKING);

    expect(screen.getByRole("status")).toHaveTextContent("Loading transactions");
    expect(await screen.findByText("Showing 10 of 13")).toBeInTheDocument();
    expect(rows()).toHaveLength(10);
  });

  it("appends the next page below the loaded rows and hides the button at the end", async () => {
    renderHistory(JANE_CHECKING);
    await screen.findByText("Showing 10 of 13");
    const firstPage = rows().map((row) => row.textContent);

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Showing 13 of 13")).toBeInTheDocument();
    expect(
      rows()
        .slice(0, 10)
        .map((row) => row.textContent),
    ).toEqual(firstPage);
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("keeps the rows when loading more fails, and can try again", async () => {
    renderHistory(JANE_CHECKING);
    await screen.findByText("Showing 10 of 13");
    server.use(
      http.get(
        apiUrl("/api/transactions/:accountId"),
        () => HttpResponse.json({ code: "GEN_001", status: 500 }, { status: 500 }),
        { once: true },
      ),
    );

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side");
    expect(rows()).toHaveLength(10);

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("Showing 13 of 13")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error with a retry when the first page fails", async () => {
    server.use(
      http.get(
        apiUrl("/api/transactions/:accountId"),
        () => HttpResponse.json({ code: "GEN_001", status: 500 }, { status: 500 }),
        { once: true },
      ),
    );
    renderHistory(JANE_CHECKING);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load your transactions",
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Showing 10 of 13")).toBeInTheDocument();
  });

  it("doesn't offer a retry for another customer's account", async () => {
    renderHistory(3);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This account isn't linked to your profile.",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("says when an account has no transactions", async () => {
    await signIn("demo.empty");
    renderHistory(EMPTY_ACCOUNT);

    expect(await screen.findByText("No transactions yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});

describe("flattenHistory", () => {
  const row = (id: number) => ({ id }) as Transaction;
  const page = (ids: number[], totalElements: number) =>
    ({ content: ids.map(row), totalElements }) as Page<Transaction>;

  it("keeps a row once when a new transaction pushed it onto the next page", () => {
    const { transactions, total } = flattenHistory([page([9, 8, 7], 6), page([7, 6, 5], 7)]);

    expect(transactions.map(({ id }) => id)).toEqual([9, 8, 7, 6, 5]);
    expect(total).toBe(7);
  });

  it("is empty with no pages", () => {
    expect(flattenHistory([])).toEqual({ transactions: [], total: 0 });
  });
});
