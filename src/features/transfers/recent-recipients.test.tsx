import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { transactionKeys } from "@/features/transactions/queries";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import type { Transaction } from "@/shared/api/types";

import { createTransfersApi } from "./api";
import { recentRecipients } from "./recent-recipients";
import { TransferScreen } from "./transfer-screen";

function tx(fields: Partial<Transaction>): Transaction {
  return {
    id: 1,
    amount: 100,
    type: "FUND_TRANSFER",
    direction: "DEBIT",
    timestamp: "2026-10-01T12:00:00",
    description: null,
    relatedAccount: "2899010846",
    accountId: 1,
    balanceAfter: null,
    ...fields,
  };
}

describe("recentRecipients", () => {
  it("lists accounts money was sent to, newest first, each once", () => {
    expect(
      recentRecipients([
        tx({ relatedAccount: "2899010846" }),
        tx({ relatedAccount: "4410298911" }),
        tx({ relatedAccount: "2899010846" }),
      ]),
    ).toEqual(["2899010846", "4410298911"]);
  });

  it("skips money in, other types and rows without an account", () => {
    expect(
      recentRecipients([
        tx({ direction: "CREDIT", relatedAccount: "9402179920" }),
        tx({ type: "BILL_PAYMENT", relatedAccount: "1000000001" }),
        tx({ relatedAccount: null }),
      ]),
    ).toEqual([]);
  });

  it("stops at three", () => {
    const rows = ["1111111111", "2222222222", "3333333333", "4444444444"].map((number) =>
      tx({ relatedAccount: number }),
    );
    expect(recentRecipients(rows)).toEqual(["1111111111", "2222222222", "3333333333"]);
  });
});

describe("recent recipients on the transfer form", () => {
  beforeEach(async () => {
    await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
  });

  function renderScreen() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TransferScreen onContinue={vi.fn()} />
      </QueryClientProvider>,
    );
    return client;
  }

  it("fills in the recipient from a recent transfer", async () => {
    // Seed: Jane's checking 8751138057 has no outgoing transfers yet.
    await createTransfersApi(getAppSession().client).send({
      fromAccountNumber: "8751138057",
      toAccountNumber: "2899010846",
      amount: 25,
    });
    const user = userEvent.setup();
    renderScreen();

    const recent = within(await screen.findByRole("group", { name: "Recent" }));
    await user.click(recent.getByRole("button", { name: "2899 0108 46" }));

    expect(screen.getByLabelText("To account number")).toHaveValue("2899 0108 46");
  });

  it("shows no shortcuts when the account hasn't sent money yet", async () => {
    const client = renderScreen();
    await vi.waitFor(() =>
      expect(client.getQueryState(transactionKeys.list(1))?.status).toBe("success"),
    );
    expect(screen.queryByRole("group", { name: "Recent" })).toBeNull();
  });
});
