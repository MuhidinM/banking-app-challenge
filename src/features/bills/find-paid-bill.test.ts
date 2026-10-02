import { beforeEach, describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import type { Account } from "@/shared/api/types";
import { toCents } from "@/shared/lib/money";

import { billerFromDescription, findPaidBill } from "./find-paid-bill";

import type { CheckedBill } from "./bill-details";

const checking: Account = {
  id: 1,
  accountNumber: "8751138057",
  balance: 8640,
  userId: 1,
  accountType: "CHECKING",
};

const bill = (biller: string, amount: number): CheckedBill => ({
  from: checking,
  biller,
  amountCents: toCents(amount),
  request: { accountNumber: checking.accountNumber, biller, amount },
});

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("billerFromDescription", () => {
  it.each([
    ["Bill Payment to Ethio Telecom", "Ethio Telecom"],
    ["bill payment to  DStv Ethiopia ", "DStv Ethiopia"],
    ["Electricity, September", "Electricity, September"],
    [null, null],
    ["  ", null],
  ])("%s → %s", (description, biller) => {
    expect(billerFromDescription(description)).toBe(biller);
  });
});

describe("findPaidBill", () => {
  it("finds the payment just made in the account's history", async () => {
    const { client } = getAppSession();
    // Seed: id 9 is "Bill Payment to Ethio Telecom", ETB 235.00.
    expect(await findPaidBill(client, bill("Ethio Telecom", 235))).toMatchObject({ id: 9 });
  });

  it("doesn't take a payment of the same amount to another biller", async () => {
    const { client } = getAppSession();
    expect(await findPaidBill(client, bill("DStv Ethiopia", 235))).toBeNull();
  });

  it("doesn't take a payment of another amount", async () => {
    const { client } = getAppSession();
    expect(await findPaidBill(client, bill("Ethio Telecom", 236))).toBeNull();
  });
});
