import { describe, expect, it } from "vitest";

import type { Account } from "@/shared/api/types";

import { type BillInput, OTHER_BILLER, amountError, billerName, checkBill } from "./bill-details";

const checking: Account = {
  id: 1,
  accountNumber: "8751138057",
  balance: 8640,
  userId: 1,
  accountType: "CHECKING",
};

const input = (fields: Partial<BillInput> = {}): BillInput => ({
  fromAccountId: 1,
  biller: "Ethio Telecom",
  otherBiller: "",
  amount: "235",
  ...fields,
});

describe("checkBill", () => {
  it("builds the API request in the API's units", () => {
    const result = checkBill(input({ amount: "235.50" }), [checking]);
    expect(result.ok && result.bill.request).toEqual({
      accountNumber: "8751138057",
      biller: "Ethio Telecom",
      amount: 235.5,
    });
  });

  it("uses the typed name for Other, trimmed", () => {
    const result = checkBill(input({ biller: OTHER_BILLER, otherBiller: "  Abyssinia Gym  " }), [
      checking,
    ]);
    expect(result.ok && result.bill.biller).toBe("Abyssinia Gym");
  });

  it.each<[string, Partial<BillInput>, Record<string, string>]>([
    [
      "no account",
      { fromAccountId: undefined },
      { fromAccountId: "Choose the account to pay from." },
    ],
    ["no biller", { biller: "" }, { biller: "Choose who you're paying." }],
    [
      "Other without a name",
      { biller: OTHER_BILLER, otherBiller: " " },
      { otherBiller: "Enter the biller's name." },
    ],
    ["no amount", { amount: "" }, { amount: "Enter an amount." }],
    ["zero", { amount: "0" }, { amount: "Enter an amount greater than ETB 0.00." }],
    [
      "more than the balance",
      { amount: "8640.01" },
      { amount: "Insufficient funds. Available: ETB 8,640.00." },
    ],
  ])("refuses %s", (_case, fields, errors) => {
    expect(checkBill(input(fields), [checking])).toEqual({ ok: false, errors });
  });

  it("allows paying the whole balance", () => {
    expect(checkBill(input({ amount: "8,640.00" }), [checking]).ok).toBe(true);
  });
});

describe("amountError", () => {
  it("says nothing while the field is empty", () => {
    expect(amountError("", checking)).toBeUndefined();
  });

  it("refuses an amount it can't read", () => {
    expect(amountError("1.234", checking)).toBe("Enter an amount like 250.00.");
  });
});

describe("billerName", () => {
  it("is the chosen biller, or the typed name for Other", () => {
    expect(billerName({ biller: "DStv Ethiopia", otherBiller: "ignored" })).toBe("DStv Ethiopia");
    expect(billerName({ biller: OTHER_BILLER, otherBiller: "Gym" })).toBe("Gym");
  });
});
