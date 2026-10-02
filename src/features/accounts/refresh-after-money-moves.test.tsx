import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { transactionKeys } from "@/features/transactions/queries";
import { TransactionHistory } from "@/features/transactions/transaction-history";
import { TransferFlow } from "@/features/transfers/transfer-flow";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { fakeNavigation } from "@/test/fake-navigation";

import { AccountsList } from "./accounts-list";
import { accountKeys } from "./queries";
import { refreshAfterMoneyMoves } from "./refresh-after-money-moves";

vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).navigationModule);

// Seed: Jane's Checking 8751138057 (id 1, ETB 8,640.00) and Savings 4410298911 (id 2, ETB 2,200.00).
const checking = {
  id: 1,
  accountNumber: "8751138057",
  balance: 8640,
  userId: 1,
  accountType: "CHECKING",
} as const;
const savings = {
  id: 2,
  accountNumber: "4410298911",
  balance: 2200,
  userId: 1,
  accountType: "SAVINGS",
} as const;

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("refreshAfterMoneyMoves", () => {
  function clientWithAccounts() {
    const client = new QueryClient();
    client.setQueryData(accountKeys.list(), [checking, savings]);
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    const keys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    return { client, keys };
  }

  it("refetches balances and both histories for a transfer between own accounts", async () => {
    const { client, keys } = clientWithAccounts();
    await refreshAfterMoneyMoves(client, { fromAccountId: 1, toAccountNumber: "4410298911" });
    expect(keys()).toEqual([accountKeys.all, transactionKeys.list(1), transactionKeys.list(2)]);
  });

  it("refetches only the source history for someone else's account, or a bill", async () => {
    const { client, keys } = clientWithAccounts();
    await refreshAfterMoneyMoves(client, { fromAccountId: 1, toAccountNumber: "2899010846" });
    await refreshAfterMoneyMoves(client, { fromAccountId: 2 });
    expect(keys()).toEqual([
      accountKeys.all,
      transactionKeys.list(1),
      accountKeys.all,
      transactionKeys.list(2),
    ]);
  });
});

describe("after a transfer, balances and history update without a reload (R-FLOW-18)", () => {
  it("between the user's own accounts", async () => {
    fakeNavigation.reset("/transfer");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={client}>
        <AccountsList />
        <section aria-label="Savings history">
          <TransactionHistory accountId={2} />
        </section>
        <TransferFlow />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("2 accounts · ETB 10,840.00 total")).toBeInTheDocument();
    const savingsHistory = within(screen.getByRole("region", { name: "Savings history" }));
    await savingsHistory.findAllByRole("listitem");
    expect(savingsHistory.queryByText("Rainy day fund")).toBeNull();

    await user.type(screen.getByLabelText("To account number"), "4410298911");
    await user.type(screen.getByLabelText("Amount in ETB"), "500");
    await user.type(screen.getByLabelText("Note (optional)"), "Rainy day fund");
    await user.click(screen.getAllByRole("button", { name: /^Send ETB/ })[0]!);
    await user.click(
      within(screen.getByRole("dialog", { name: "Review transfer" })).getByRole("button", {
        name: "Confirm and send",
      }),
    );

    // The app then moves to the receipt. Here the screens stay mounted (fake
    // navigation) and the review stays open over them, which hides them from the
    // accessibility tree, so they are read with `hidden: true`.
    await vi.waitFor(() => expect(fakeNavigation.href).toMatch(/^\/transfer\/receipt\/\d+$/));

    // No reload: both balances and the recipient's history changed.
    const accounts = within(screen.getByRole("list", { name: "Your accounts", hidden: true }));
    expect(await accounts.findByText("ETB 8,140.00")).toBeInTheDocument();
    expect(accounts.getByText("ETB 2,700.00")).toBeInTheDocument();
    expect(await savingsHistory.findByText("Rainy day fund")).toBeInTheDocument();
  });
});
