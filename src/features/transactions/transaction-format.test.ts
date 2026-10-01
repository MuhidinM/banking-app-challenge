import { describe, expect, it } from "vitest";

import type { Transaction } from "@/shared/api/types";
import { transactionTypes } from "@/shared/api/types";

import {
  groupTransactionsByDay,
  signedAmount,
  transactionMeta,
  transactionSentence,
  transactionTitle,
  transactionTypeInfo,
} from "./transaction-format";

const ADDIS = { timeZone: "Africa/Addis_Ababa" }; // UTC+3, no daylight saving

function tx(fields: Partial<Transaction> = {}): Transaction {
  return {
    id: 1,
    amount: 1665,
    type: "REFUND",
    direction: "CREDIT",
    timestamp: "2026-10-01T12:18:00",
    description: "Refund from merchant",
    relatedAccount: null,
    accountId: 1,
    balanceAfter: null,
    ...fields,
  };
}

describe("transactionTitle", () => {
  it("uses the API's description", () => {
    expect(transactionTitle(tx())).toBe("Refund from merchant");
  });

  it.each([
    [
      { type: "FUND_TRANSFER", direction: "CREDIT", relatedAccount: "9402179920" },
      "Transfer from 9402 1799 20",
    ],
    [
      { type: "FUND_TRANSFER", direction: "DEBIT", relatedAccount: "2899010846" },
      "Transfer to 2899 0108 46",
    ],
    [{ type: "ATM_WITHDRAWAL", direction: "DEBIT" }, "ATM withdrawal"],
  ] as const)("falls back to the type and other account: %j → %s", (fields, title) => {
    expect(transactionTitle(tx({ ...fields, description: null }))).toBe(title);
    expect(transactionTitle(tx({ ...fields, description: "  " }))).toBe(title);
  });
});

describe("row text", () => {
  it("has a label and icon for every type the API documents", () => {
    for (const type of transactionTypes) {
      expect(transactionTypeInfo[type].label).toMatch(/^[A-Z]/);
      expect(transactionTypeInfo[type].icon).toBeDefined();
    }
  });

  it("signs the amount from the direction", () => {
    expect(signedAmount(tx())).toBe("+ETB 1,665.00");
    expect(signedAmount(tx({ amount: 15, direction: "DEBIT" }))).toBe("−ETB 15.00");
  });

  it('writes the meta as "Type · HH:mm" in local time', () => {
    expect(transactionMeta(tx(), ADDIS)).toBe("Refund · 15:18");
  });

  it("reads the whole row as one sentence, direction in words", () => {
    const now = new Date("2026-10-01T15:00:00Z");
    expect(transactionSentence(tx(), now, ADDIS)).toBe(
      "Refund from merchant. Money in, ETB 1,665.00. Refund, Today, 15:18.",
    );
    expect(
      transactionSentence(
        tx({
          type: "ACCESS_FEE",
          direction: "DEBIT",
          amount: 15,
          description: "Monthly access fee",
          timestamp: "2026-09-30T17:18:00",
        }),
        now,
        ADDIS,
      ),
    ).toBe("Monthly access fee. Money out, ETB 15.00. Access fee, Yesterday, 20:18.");
  });
});

describe("groupTransactionsByDay", () => {
  it("splits at local midnight, not UTC midnight", () => {
    // 1 Oct 01:30 in Addis Ababa; the API sends UTC without an offset.
    const now = new Date("2026-09-30T22:30:00Z");
    const rows = [
      tx({ id: 4, timestamp: "2026-09-30T21:10:00" }), // 00:10 on 1 Oct locally
      tx({ id: 3, timestamp: "2026-09-30T20:50:00" }), // 23:50 on 30 Sep
      tx({ id: 2, timestamp: "2026-09-30T08:00:00" }), // 11:00 on 30 Sep
      tx({ id: 1, timestamp: "2026-09-27T21:30:00" }), // 00:30 on 28 Sep
    ];

    const groups = groupTransactionsByDay(rows, now, ADDIS);

    expect(groups.map((group) => [group.label, group.items.map(({ id }) => id)])).toEqual([
      ["Today", [4]],
      ["Yesterday", [3, 2]],
      ["Monday, 28 Sep", [1]],
    ]);
  });
});
