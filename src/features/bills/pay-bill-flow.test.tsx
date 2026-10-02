import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { TransactionHistory } from "@/features/transactions/transaction-history";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { Toaster } from "@/shared/ui/toast";

import { PayBillFlow } from "./pay-bill-flow";

vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).navigationModule);

/** Every POST /api/accounts/pay-bill body; falls through to the mock. */
function recordPayments() {
  const bodies: unknown[] = [];
  server.use(
    http.post(apiUrl("/api/accounts/pay-bill"), async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

// Seed: Jane's Checking 8751138057 (id 1, ETB 8,640.00) and Savings (id 2, ETB 2,200.00).
async function renderFlow(initialFromId?: number, { withHistory = false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <PayBillFlow initialFromId={initialFromId} />
      {withHistory ? <TransactionHistory accountId={1} /> : null}
      <Toaster />
    </QueryClientProvider>,
  );
  const amount = await screen.findByLabelText("Amount in ETB");
  // Web and phone layouts each have a Pay button; jsdom shows both.
  const pay = () => screen.getAllByRole("button", { name: /^Pay / })[0]!;
  const chooseBiller = async (name: string) => {
    await user.click(screen.getByRole("combobox", { name: "Biller" }));
    await user.click(await screen.findByRole("option", { name }));
  };
  return { user, amount, pay, chooseBiller };
}

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("Pay a bill", () => {
  it("keeps Pay disabled, with the reason, until the payment is valid", async () => {
    const { user, amount, pay, chooseBiller } = await renderFlow();

    expect(pay()).toBeDisabled();
    expect(pay()).toHaveAccessibleDescription("Choose a biller to continue.");

    await chooseBiller("Ethio Telecom");
    expect(pay()).toHaveAccessibleDescription("Enter an amount to continue.");

    await user.type(amount, "235");
    expect(pay()).toBeEnabled();
    expect(pay()).toHaveTextContent("Pay ETB 235.00");
  });

  it("shows Insufficient funds as the amount is typed (the design's error state)", async () => {
    const { user, amount, pay, chooseBiller } = await renderFlow();
    await chooseBiller("Ethio Telecom");

    await user.type(amount, "9000");

    expect(screen.getByText("Insufficient funds. Available: ETB 8,640.00.")).toBeInTheDocument();
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(pay()).toBeDisabled();
    expect(pay()).toHaveAccessibleDescription("Fix the amount to continue.");
    // The Summary shows the amount in the error colour too (WebPayBill).
    const summaryAmount = screen.getByText("Amount", { selector: "dt" }).nextElementSibling;
    expect(summaryAmount).toHaveClass("text-debit");
    expect(summaryAmount).not.toHaveClass("text-ink");
  });

  it("pays once, even when Pay is double-clicked, and starts again with the new balance", async () => {
    const bodies = recordPayments();
    const { user, amount, pay, chooseBiller } = await renderFlow();
    await chooseBiller("Ethiopian Electric Utility");
    await user.type(amount, "640");

    await user.dblClick(pay());

    expect(
      await screen.findByText("Paid ETB 640.00 to Ethiopian Electric Utility."),
    ).toBeInTheDocument();
    expect(bodies).toEqual([
      { accountNumber: "8751138057", biller: "Ethiopian Electric Utility", amount: 640 },
    ]);
    // The balances were refetched and the form is fresh.
    expect(await screen.findByText("Available ETB 8,000.00")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount in ETB")).toHaveValue("");
  });

  it("refreshes the paying account's history on the same screen (R-FLOW-18)", async () => {
    const { user, amount, pay, chooseBiller } = await renderFlow(undefined, { withHistory: true });
    await screen.findByText("Showing 10 of 13");
    await chooseBiller("DStv Ethiopia");
    await user.type(amount, "99");

    await user.click(pay());

    expect(await screen.findByText("Showing 10 of 14")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /^Bill Payment to DStv Ethiopia\. Money out, ETB 99\.00/,
      }),
    ).toBeInTheDocument();
  });

  it("pays a biller that isn't in the list", async () => {
    const bodies = recordPayments();
    const { user, amount, pay, chooseBiller } = await renderFlow();
    await chooseBiller("Other");
    await user.type(amount, "100");
    expect(pay()).toHaveAccessibleDescription("Enter the biller's name to continue.");

    await user.type(screen.getByLabelText("Biller name"), "Abyssinia Gym");
    await user.click(pay());

    expect(await screen.findByText("Paid ETB 100.00 to Abyssinia Gym.")).toBeInTheDocument();
    expect(bodies).toEqual([{ accountNumber: "8751138057", biller: "Abyssinia Gym", amount: 100 }]);
  });

  it("starts from the account in ?from=, and Max fills its balance", async () => {
    const { user, amount } = await renderFlow(2);

    expect(screen.getByRole("combobox", { name: "Pay from" })).toHaveTextContent("Savings");
    await user.click(screen.getByRole("button", { name: "Max" }));
    expect(amount).toHaveValue("2,200.00");
  });

  it("puts the API's refusal on the amount", async () => {
    server.use(
      http.post(apiUrl("/api/accounts/pay-bill"), () =>
        HttpResponse.json({ code: "ACC_002", status: 400 }, { status: 400 }),
      ),
    );
    const { user, amount, pay, chooseBiller } = await renderFlow();
    await chooseBiller("Ethio Telecom");
    await user.type(amount, "100");

    await user.click(pay());

    expect(
      await screen.findByText("Insufficient funds. Available: ETB 8,640.00."),
    ).toBeInTheDocument();
    expect(amount).toHaveAttribute("aria-invalid", "true");
  });

  it("explains a failure it can't place on a field above the form", async () => {
    server.use(
      http.post(apiUrl("/api/accounts/pay-bill"), () =>
        HttpResponse.json({ code: "GEN_001", status: 500 }, { status: 500 }),
      ),
    );
    const { user, amount, pay, chooseBiller } = await renderFlow();
    await chooseBiller("Ethio Telecom");
    await user.type(amount, "100");

    await user.click(pay());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong on our side. Please try again.",
    );
    expect(pay()).toBeEnabled();
  });
});
