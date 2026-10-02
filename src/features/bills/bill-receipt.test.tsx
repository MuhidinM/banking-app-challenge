import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import type { Account } from "@/shared/api/types";
import { toCents } from "@/shared/lib/money";

import { BillReceipt, billReceiptText } from "./bill-receipt";

// Seed, Jane's Checking (id 1): id 9 is "Bill Payment to Ethio Telecom",
// ETB 235.00, with a balanceAfter; id 13 is a refund, not a bill payment.
function renderReceipt(transactionId: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BillReceipt transactionId={transactionId} />
    </QueryClientProvider>,
  );
}

const row = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling as HTMLElement;

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "share");
});

describe("BillReceipt", () => {
  it("loads the payment by id, so it survives a reload", async () => {
    renderReceipt(9);

    expect(await screen.findByRole("heading", { level: 1, name: "Bill paid" })).toBeInTheDocument();
    expect(screen.getByText("ETB 235.00 to Ethio Telecom")).toBeInTheDocument();
    expect(row("Biller")).toHaveTextContent("Ethio Telecom");
    expect(row("Reference")).toHaveTextContent("TX-000009");
    expect(row("New balance")).toHaveTextContent(/^ETB [\d,]+\.\d{2}$/);
    expect(await screen.findByText("Checking •••• 8057")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Done" })).toHaveAttribute("href", "/");
  });

  it("says so when the id isn't a bill payment", async () => {
    renderReceipt(13);

    expect(await screen.findByText("We couldn't find this receipt")).toBeInTheDocument();
  });

  it("offers a retry when the receipt can't load", async () => {
    server.use(
      http.get(apiUrl("/api/accounts/pay-bill/:id"), () =>
        HttpResponse.json({ code: "GEN_001", status: 500 }, { status: 500 }),
      ),
    );
    renderReceipt(9);

    expect(await screen.findByText("We couldn't load this receipt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shares the receipt as text", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderReceipt(9);

    await userEvent.click(await screen.findByRole("button", { name: "Share receipt" }));

    expect(share).toHaveBeenCalledWith({
      title: "Bill payment receipt",
      text: expect.stringContaining("ETB 235.00 to Ethio Telecom") as string,
    });
  });
});

describe("billReceiptText", () => {
  const checking: Account = {
    id: 1,
    accountNumber: "8751138057",
    balance: 8405,
    userId: 1,
    accountType: "CHECKING",
  };

  it("lists the payment, and leaves out what isn't known", () => {
    expect(
      billReceiptText({
        amount: toCents(235),
        biller: "Ethio Telecom",
        from: checking,
        date: new Date("2026-10-01T12:18:00Z"),
        newBalance: undefined,
      }),
    ).toMatch(
      /^Kifiya Bank bill payment receipt\nETB 235\.00 to Ethio Telecom\nFrom: Checking •••• 8057\nDate: 1 Oct 2026, \d{2}:18$/,
    );
  });
});
