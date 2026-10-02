import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Account } from "@/shared/api/types";

import { TransferForm } from "./transfer-form";

import type { CheckedTransfer } from "./transfer-details";

const accounts: Account[] = [
  { id: 1, accountNumber: "8751138057", balance: 8640, userId: 1, accountType: "CHECKING" },
  { id: 2, accountNumber: "4410298911", balance: 2200, userId: 1, accountType: "SAVINGS" },
];

function renderForm(initialFromId?: number) {
  const onContinue = vi.fn<(transfer: CheckedTransfer) => void>();
  const user = userEvent.setup();
  render(
    <TransferForm accounts={accounts} initialFromId={initialFromId} onContinue={onContinue} />,
  );
  const amount = screen.getByLabelText("Amount in ETB");
  const recipient = screen.getByLabelText("To account number");
  // Web and phone layouts each have one submit button; jsdom shows both.
  const submit = () =>
    user.click(screen.getAllByRole("button", { name: /^(Continue|Send ETB)/ })[0]!);
  return { user, onContinue, amount, recipient, submit };
}

describe("TransferForm", () => {
  it("hands over the checked transfer", async () => {
    const { user, onContinue, amount, recipient, submit } = renderForm();

    await user.type(recipient, "2899010846");
    await user.type(amount, "250");
    await user.type(screen.getByLabelText("Note (optional)"), "Rent for September");
    await submit();

    expect(onContinue).toHaveBeenCalledOnce();
    expect(onContinue.mock.calls[0]![0].request).toEqual({
      fromAccountNumber: "8751138057",
      toAccountNumber: "2899010846",
      amount: 250,
      note: "Rent for September",
    });
  });

  it("formats the recipient as it is typed", async () => {
    const { user, recipient } = renderForm();
    await user.type(recipient, "2899010846");
    expect(recipient).toHaveValue("2899 0108 46");
  });

  it("formats the amount when leaving the field", async () => {
    const { user, amount } = renderForm();
    await user.type(amount, "9000");
    await user.tab();
    expect(amount).toHaveValue("9,000.00");
  });

  it("adds the quick amounts in cents, and Max uses the balance", async () => {
    const { user, amount } = renderForm();

    await user.type(amount, "0.10");
    await user.click(screen.getByRole("button", { name: "+100" }));
    await user.click(screen.getByRole("button", { name: "+1,000" }));
    expect(amount).toHaveValue("1,100.10");

    await user.click(screen.getByRole("button", { name: "Max" }));
    expect(amount).toHaveValue("8,640.00");
  });

  it("says Insufficient funds as soon as the amount is too high", async () => {
    const { user, amount } = renderForm();

    await user.type(amount, "9000");

    expect(screen.getByText("Insufficient funds. Available: ETB 8,640.00.")).toBeInTheDocument();
    expect(amount).toHaveAttribute("aria-invalid", "true");
  });

  it("catches invalid input before review and focuses the first problem", async () => {
    const { user, onContinue, recipient, submit } = renderForm();

    await user.type(recipient, "8751138057");
    await submit();

    expect(screen.getByText("Cannot transfer to the same account.")).toBeInTheDocument();
    expect(screen.getByText("Enter an amount.")).toBeInTheDocument();
    expect(recipient).toHaveFocus();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("preselects the account from ?from=, and shows its balance", () => {
    renderForm(2);
    expect(screen.getByRole("combobox", { name: "From" })).toHaveTextContent("Savings · •••• 8911");
  });

  it("counts the note's characters", async () => {
    const { user } = renderForm();
    await user.type(screen.getByLabelText("Note (optional)"), "Rent");
    expect(screen.getByText("4/140")).toBeInTheDocument();
  });

  it("names the amount on the send button and in the summary", async () => {
    const { user, amount, recipient } = renderForm();
    await user.type(recipient, "2899010846");
    await user.type(amount, "250");

    expect(screen.getAllByRole("button", { name: "Send ETB 250.00" })).toHaveLength(2);
    const summary = screen.getByRole("heading", { name: "Summary" }).parentElement!;
    expect(summary).toHaveTextContent("To2899010846");
    expect(summary).toHaveTextContent("FeeETB 0.00");
    expect(summary).toHaveTextContent("TotalETB 250.00");
  });
});
