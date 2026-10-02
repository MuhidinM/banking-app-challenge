import { describe, expect, it } from "vitest";

import type { Transaction } from "@/shared/api/types";

import { transactionsCsv, transactionsFileName } from "./transactions-csv";

const ADDIS = { timeZone: "Africa/Addis_Ababa" }; // UTC+3

function tx(fields: Partial<Transaction> = {}): Transaction {
  return {
    id: 117,
    amount: 250,
    type: "FUND_TRANSFER",
    direction: "DEBIT",
    timestamp: "2026-09-30T21:18:00",
    description: "Rent, September",
    relatedAccount: "2899010846",
    accountId: 1,
    balanceAfter: 8390,
    ...fields,
  };
}

describe("transactionsCsv", () => {
  it("writes a header and one row per transaction, in local time", () => {
    const [header, row, end] = transactionsCsv([tx()], ADDIS).split("\r\n");
    expect(header).toBe(
      "Date,Reference,Description,Type,Direction,Amount (ETB),Balance after (ETB),Other account",
    );
    // 21:18 UTC is past midnight in Addis Ababa.
    expect(row).toBe(
      '2026-10-01 00:18,TX-000117,"Rent, September",Transfer,Money out,-250,8390,2899010846',
    );
    expect(end).toBe("");
  });

  it("writes money in as positive and leaves missing values empty", () => {
    const row = transactionsCsv(
      [
        tx({
          direction: "CREDIT",
          type: "REFUND",
          amount: 1665.5,
          relatedAccount: null,
          balanceAfter: null,
        }),
      ],
      ADDIS,
    ).split("\r\n")[1];
    expect(row).toBe('2026-10-01 00:18,TX-000117,"Rent, September",Refund,Money in,1665.5,,');
  });
});

describe("transactionsFileName", () => {
  it("names the file after the account and the day", () => {
    expect(transactionsFileName("Checking •••• 8057", new Date(2026, 9, 2, 12))).toBe(
      "kifiya-checking-8057-2026-10-02.csv",
    );
    expect(transactionsFileName(undefined, new Date(2026, 9, 2, 12))).toBe(
      "kifiya-transactions-2026-10-02.csv",
    );
  });
});
