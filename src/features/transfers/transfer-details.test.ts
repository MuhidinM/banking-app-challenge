import { describe, expect, it } from "vitest";

import type { Account } from "@/shared/api/types";
import { toCents } from "@/shared/lib/money";

import { type TransferInput, amountError, checkTransfer } from "./transfer-details";

const checking: Account = {
  id: 1,
  accountNumber: "8751138057",
  balance: 8640,
  userId: 1,
  accountType: "CHECKING",
};
const accounts = [checking];

const valid: TransferInput = {
  fromAccountId: 1,
  toAccountNumber: "2899 0108 46",
  amount: "250.00",
  note: " Rent for September ",
};

const errorsFor = (changes: Partial<TransferInput>) => {
  const result = checkTransfer({ ...valid, ...changes }, accounts);
  return result.ok ? {} : result.errors;
};

describe("checkTransfer", () => {
  it("builds the API request from what was typed", () => {
    const result = checkTransfer(valid, accounts);
    expect(result.ok && result.transfer.request).toEqual({
      fromAccountNumber: "8751138057",
      toAccountNumber: "2899010846",
      amount: 250,
      note: "Rent for September",
    });
    expect(result.ok && result.transfer.amountCents).toBe(toCents(250));
  });

  it("leaves an empty note out", () => {
    const result = checkTransfer({ ...valid, note: "   " }, accounts);
    expect(result.ok && result.transfer.request).not.toHaveProperty("note");
  });

  it("asks for what is missing", () => {
    expect(errorsFor({ fromAccountId: undefined, toAccountNumber: "", amount: "" })).toEqual({
      fromAccountId: "Choose the account to send from.",
      toAccountNumber: "Enter the recipient's account number.",
      amount: "Enter an amount.",
    });
  });

  it.each([
    [
      { toAccountNumber: "2899 0108" },
      "toAccountNumber",
      "Kifiya Bank account numbers have 10 digits.",
    ],
    [
      { toAccountNumber: "8751 1380 57" },
      "toAccountNumber",
      "Cannot transfer to the same account.",
    ],
    [{ amount: "0" }, "amount", "Enter an amount greater than ETB 0.00."],
    [{ amount: "8640.01" }, "amount", "Insufficient funds. Available: ETB 8,640.00."],
    [{ note: "x".repeat(141) }, "note", "Keep the note to 140 characters."],
  ] as const)("%j → %s: %s", (changes, field, message) => {
    expect(errorsFor(changes)).toEqual({ [field]: message });
  });

  it("allows sending the whole balance", () => {
    expect(errorsFor({ amount: "8,640.00" })).toEqual({});
  });
});

describe("amountError", () => {
  it("says nothing until something is typed", () => {
    expect(amountError("", checking)).toBeUndefined();
  });

  it("caps a single transfer at the API's limit", () => {
    const rich = { ...checking, balance: 5_000_000_000 };
    expect(amountError("1000000000.01", rich)).toBe(
      "The most you can send at once is ETB 1,000,000,000.00.",
    );
    expect(amountError("1000000000", rich)).toBeUndefined();
  });

  it("refuses something that isn't an amount", () => {
    expect(amountError(".", checking)).toBe("Enter an amount like 250.00.");
  });
});
