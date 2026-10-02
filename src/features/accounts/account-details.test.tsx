import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { Toaster } from "@/shared/ui/toast";
import { fakeNavigation } from "@/test/fake-navigation";

import { AccountDetails } from "./account-details";

vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).navigationModule);

// Seed: Jane's Checking •••• 8057 is id 1 (13 transactions), Savings •••• 8911 is id 2.
function renderDetails(accountId: number, href = `/accounts/${accountId}`) {
  fakeNavigation.reset(href);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AccountDetails accountId={accountId} />
      <Toaster />
    </QueryClientProvider>,
  );
}

const card = () => within(screen.getByRole("region", { name: "Checking balance" }));

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("AccountDetails", () => {
  it("shows the account's card with the full number and balance", async () => {
    renderDetails(1);

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Checking account");
    expect(card().getByText("8751 1380 57")).toBeInTheDocument();
    expect(card().getByText("ETB 8,640.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to accounts" })).toHaveAttribute(
      "href",
      "/accounts",
    );
  });

  it("opens Transfer and Pay bill with this account chosen", async () => {
    renderDetails(2);
    await screen.findByRole("heading", { level: 1 });

    // The web header and the phone row each have one; both point the same way.
    for (const link of screen.getAllByRole("link", { name: "Transfer" })) {
      expect(link).toHaveAttribute("href", "/transfer?from=2");
    }
    for (const link of screen.getAllByRole("link", { name: "Pay bill" })) {
      expect(link).toHaveAttribute("href", "/pay-bill?from=2");
    }
  });

  it("shows this account's activity and filters it through the URL", async () => {
    const user = userEvent.setup();
    renderDetails(1);
    const activity = within(await screen.findByRole("region", { name: "Activity" }));
    expect(await activity.findByText("Showing 10 of 13")).toBeInTheDocument();

    await user.click(activity.getByRole("radio", { name: "Money in" }));

    expect(fakeNavigation.href).toBe("/accounts/1?direction=CREDIT");
  });

  it("copies the account number", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderDetails(1);

    await screen.findByRole("region", { name: "Checking balance" });
    await userEvent.click(card().getByRole("button", { name: "Copy account number" }));

    expect(writeText).toHaveBeenCalledWith("8751138057");
    expect(await screen.findByText("Account number copied.")).toBeInTheDocument();
  });

  it("treats an account that isn't the user's as not found", async () => {
    renderDetails(3); // demo.john's checking
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("2899 0108 46")).toBeNull();
  });

  it("offers a retry when accounts can't load", async () => {
    server.use(http.get(apiUrl("/api/accounts"), () => HttpResponse.error()));
    renderDetails(1);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this account");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
