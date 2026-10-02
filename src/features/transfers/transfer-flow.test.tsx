import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { Toaster } from "@/shared/ui/toast";
import { fakeNavigation } from "@/test/fake-navigation";

import { TransferFlow } from "./transfer-flow";

vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).navigationModule);

/** Every POST /api/accounts/transfer body; falls through to the mock. */
function recordTransfers() {
  const bodies: unknown[] = [];
  server.use(
    http.post(apiUrl("/api/accounts/transfer"), async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
}

// Seed: Jane's Checking 8751138057 (id 1, ETB 8,640.00); John's checking 2899010846.
async function renderAndFill({
  to = "2899010846",
  amount = "250",
  note = "Rent for September",
} = {}) {
  fakeNavigation.reset("/transfer");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <TransferFlow />
      <Toaster />
    </QueryClientProvider>,
  );
  await user.type(await screen.findByLabelText("To account number"), to);
  await user.type(screen.getByLabelText("Amount in ETB"), amount);
  if (note) await user.type(screen.getByLabelText("Note (optional)"), note);
  await user.click(screen.getAllByRole("button", { name: /^Send ETB/ })[0]!);
  return { user, review: () => within(screen.getByRole("dialog", { name: "Review transfer" })) };
}

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("TransferFlow", () => {
  it("shows the review with the details and the warning, without sending", async () => {
    const bodies = recordTransfers();
    const { review } = await renderAndFill();

    expect(review().getByText("ETB 250.00")).toBeInTheDocument();
    expect(review().getByText("Checking •••• 8057")).toBeInTheDocument();
    expect(review().getByText("2899010846")).toBeInTheDocument();
    expect(review().getByText("ETB 0.00")).toBeInTheDocument();
    expect(review().getByText("Rent for September")).toBeInTheDocument();
    expect(
      review().getByText("Transfers are instant and cannot be reversed. Check the account number."),
    ).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it("sends once from Confirm, even when it is double-clicked", async () => {
    const bodies = recordTransfers();
    const { user, review } = await renderAndFill();

    await user.dblClick(review().getByRole("button", { name: "Confirm and send" }));

    await vi.waitFor(() => expect(fakeNavigation.href).toBe("/accounts/1"));
    expect(bodies).toEqual([
      {
        fromAccountNumber: "8751138057",
        toAccountNumber: "2899010846",
        amount: 250,
        note: "Rent for September",
      },
    ]);
    expect(await screen.findByText("Sent ETB 250.00 to 2899010846.")).toBeInTheDocument();
  });

  it("goes back to the form with everything kept on Edit details", async () => {
    const bodies = recordTransfers();
    const { user, review } = await renderAndFill();

    await user.click(review().getByRole("button", { name: "Edit details" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByLabelText("To account number")).toHaveValue("2899 0108 46");
    // Formatted when the user moved on to the note.
    expect(screen.getByLabelText("Amount in ETB")).toHaveValue("250.00");
    expect(bodies).toEqual([]);
  });

  it("explains a refusal in the review and lets the user try again", async () => {
    // No account has this number: the API answers 404 ACC_001.
    const bodies = recordTransfers();
    const { user, review } = await renderAndFill({ to: "1234567890", note: "" });

    await user.click(review().getByRole("button", { name: "Confirm and send" }));

    expect(await review().findByRole("alert")).toHaveTextContent(
      "Account not found. Check the number.",
    );
    expect(fakeNavigation.href).toBe("/transfer");
    await user.click(review().getByRole("button", { name: "Confirm and send" }));
    await vi.waitFor(() => expect(bodies).toHaveLength(2));
  });
});
