import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { fakeNavigation } from "@/test/fake-navigation";

import { TransactionHistory } from "./transaction-history";

vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).navigationModule);

// Seed, Jane's checking (account 1): id 13 "Refund from merchant" (newest,
// with balanceAfter), id 11 "P2P Transfer from 9402179920", id 1 "Cash
// deposit at Bole branch" (oldest, on page 2, no balanceAfter). Id 16 is John's.
function renderActivity(href: string) {
  fakeNavigation.reset(href);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <h1 tabIndex={-1} data-page-heading="">
        Activity
      </h1>
      <TransactionHistory accountId={1} />
    </QueryClientProvider>,
  );
}

const detailRow = (dialog: HTMLElement, term: string) =>
  within(dialog).getByText(term, { selector: "dt" }).nextElementSibling;

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

afterEach(() => {
  // jsdom has no navigator.share; remove the one a test added.
  Reflect.deleteProperty(navigator, "share");
});

describe("transaction details", () => {
  it("opens from a row through ?tx= and shows type, direction, reference and balance after", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1");

    await user.click(await screen.findByRole("button", { name: /^Refund from merchant\./ }));

    expect(fakeNavigation.href).toBe("/activity?account=1&tx=13");
    const dialog = screen.getByRole("dialog", { name: "Transaction" });
    expect(within(dialog).getByText("+ETB 1,665.00")).toBeInTheDocument();
    expect(detailRow(dialog, "Type")).toHaveTextContent("Refund");
    expect(detailRow(dialog, "Direction")).toHaveTextContent("Money in");
    expect(detailRow(dialog, "Reference")).toHaveTextContent("TX-000013");
    expect(detailRow(dialog, "Balance after")).toHaveTextContent("ETB 8,640.00");
  });

  it("shows where a transfer came from", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1");

    await user.click(await screen.findByRole("button", { name: /^P2P Transfer from/ }));

    expect(detailRow(screen.getByRole("dialog"), "From")).toHaveTextContent("9402 1799 20");
  });

  it("closes with the browser's Back button and puts focus back on the row", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1");
    const row = await screen.findByRole("button", { name: /^Refund from merchant\./ });
    await user.click(row);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fakeNavigation.router.back();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fakeNavigation.href).toBe("/activity?account=1");
    expect(row).toHaveFocus();
  });

  it("closes with its Close button by going back, not by adding a history entry", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1");
    await user.click(await screen.findByRole("button", { name: /^Refund from merchant\./ }));

    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fakeNavigation.href).toBe("/activity?account=1");
    // Forward would reopen it, as in any app that puts dialogs in the URL.
    expect(fakeNavigation.length).toBe(2);
  });

  it("reopens after a reload, even for a row on a page not loaded yet, and leaves no balance after when the API has none", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1&tx=1");

    const dialog = await screen.findByRole("dialog", { name: "Transaction" });
    expect(await within(dialog).findByText("Cash deposit at Bole branch")).toBeInTheDocument();
    expect(within(dialog).queryByText("Balance after")).not.toBeInTheDocument();

    // Nothing of ours behind it in the history: closing replaces the URL.
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fakeNavigation.href).toBe("/activity?account=1");
    expect(fakeNavigation.length).toBe(1);
  });

  it("says so when the transaction isn't in this account", async () => {
    renderActivity("/activity?account=1&tx=16");

    expect(await screen.findByText("We couldn't find this transaction.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share receipt" })).not.toBeInTheDocument();
  });

  it("shares the receipt with the system share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    renderActivity("/activity?account=1&tx=13");

    await user.click(await screen.findByRole("button", { name: "Share receipt" }));

    expect(share).toHaveBeenCalledWith({
      title: "Transaction receipt",
      text: expect.stringContaining("Reference: TX-000013") as string,
    });
  });

  it("copies the receipt where the browser can't share", async () => {
    const user = userEvent.setup();
    renderActivity("/activity?account=1&tx=13");

    await user.click(await screen.findByRole("button", { name: "Share receipt" }));

    expect(await navigator.clipboard.readText()).toMatch(
      /^Kifiya Bank transaction receipt\nRefund from merchant\n\+ETB 1,665\.00 \(Money in\)/,
    );
  });
});
