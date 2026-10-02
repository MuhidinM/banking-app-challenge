import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { Toaster } from "@/shared/ui/toast";

import { createTransfersApi } from "./api";
import { findSentTransfer } from "./find-sent-transfer";
import { TransferReceipt } from "./transfer-receipt";

import type { CheckedTransfer } from "./transfer-details";

function renderReceipt(transactionId: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TransferReceipt transactionId={transactionId} />
      <Toaster />
    </QueryClientProvider>,
  );
}

const checking = {
  id: 1,
  accountNumber: "8751138057",
  balance: 8640,
  userId: 1,
  accountType: "CHECKING",
} as const;
const transfer: CheckedTransfer = {
  from: checking,
  toAccountNumber: "2899010846",
  amountCents: 25_000 as CheckedTransfer["amountCents"],
  note: undefined,
  request: { fromAccountNumber: "8751138057", toAccountNumber: "2899010846", amount: 250 },
};

/** Sends ETB 250.00 from Jane's Checking to John, and returns the new transaction's id. */
async function sendOne() {
  const { client } = getAppSession();
  await createTransfersApi(client).send(transfer.request);
  const sent = await findSentTransfer(client, transfer);
  if (!sent) throw new Error("transfer not found");
  return sent.id;
}

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("findSentTransfer", () => {
  it("finds the transaction a transfer just created", async () => {
    const id = await sendOne();
    expect(id).toBeGreaterThan(0);
  });

  it("is null when no matching transfer is in the history", async () => {
    expect(
      await findSentTransfer(getAppSession().client, {
        ...transfer,
        toAccountNumber: "9402179920",
      }),
    ).toBeNull();
  });
});

describe("TransferReceipt", () => {
  it("loads the receipt by id: amount, recipient, account, reference and new balance", async () => {
    const id = await sendOne();
    renderReceipt(id);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Transfer sent" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ETB 250.00 to 2899010846")).toBeInTheDocument();
    expect(await screen.findByText("Checking •••• 8057")).toBeInTheDocument();
    expect(screen.getByText(`TX-${String(id).padStart(6, "0")}`)).toBeInTheDocument();
    expect(screen.getByText("ETB 8,390.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Done" })).toHaveAttribute("href", "/");
  });

  it("shares the receipt as text, or copies it", async () => {
    const id = await sendOne();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderReceipt(id);

    await userEvent.click(await screen.findByRole("button", { name: "Share receipt" }));

    expect(writeText).toHaveBeenCalledOnce();
    const text = writeText.mock.calls[0]![0];
    expect(text).toContain("ETB 250.00 to 2899 0108 46");
    expect(text).toContain(`Reference: TX-${String(id).padStart(6, "0")}`);
    expect(await screen.findByText("Receipt copied.")).toBeInTheDocument();
  });

  it("says received and from for a transfer that came in", async () => {
    // Seed: transaction 11 is John's ETB 300.00 into Jane's Checking.
    renderReceipt(11);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Transfer received" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ETB 300.00 from 9402179920")).toBeInTheDocument();
    expect(await screen.findByText("To")).toBeInTheDocument();
    expect(screen.queryByText("From")).toBeNull();
  });

  it("says so when the receipt doesn't exist", async () => {
    renderReceipt(999_999);
    expect(await screen.findByText("We couldn't find this receipt")).toBeInTheDocument();
  });
});
