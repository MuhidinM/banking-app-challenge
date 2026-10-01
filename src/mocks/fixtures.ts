import type { TransactionDirection, TransactionType } from "@/shared/api/types";

import type { AccountRecord, MockDb, TransactionRecord, UserRecord } from "./db";

/**
 * Seed data modelled on the hosted API's demo users and the UI spec's screens
 * (Checking •••• 8057 at ETB 8,640.00, Savings •••• 8911 at ETB 2,200.00).
 *
 * Credentials match the demo users documented by the API, so the same login
 * works with and without mocking:
 * - demo.jane: Checking + Savings with history (two pages of transactions)
 * - demo.john: transfer recipient (2899 0108 46 is the number used in the designs)
 * - demo.empty: a new customer with one empty account, for empty states
 */
export const DEMO_PASSWORD = "Password123!";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface HistoryEntry {
  /** How long before "now" it happened. */
  ago: number;
  type: TransactionType;
  direction: TransactionDirection;
  amount: number;
  description: string | null;
  relatedAccount?: string;
}

/**
 * Builds an account's history so that balances are consistent: works out the
 * opening balance from the final one and fills in balanceAfter for each row.
 * Rows older than `balanceAfterWithin` get no balanceAfter, like the real API's older rows.
 */
function history(
  db: MockDb,
  account: AccountRecord,
  now: Date,
  entries: HistoryEntry[],
  balanceAfterWithin = 6 * DAY,
): void {
  const signed = (entry: HistoryEntry) =>
    (entry.direction === "CREDIT" ? 1 : -1) * Math.round(entry.amount * 100);
  let balance = account.balanceCents - entries.reduce((sum, entry) => sum + signed(entry), 0);

  for (const entry of [...entries].sort((a, b) => b.ago - a.ago)) {
    balance += signed(entry);
    const record: TransactionRecord = {
      id: db.nextId.transaction++,
      accountId: account.id,
      amountCents: Math.round(entry.amount * 100),
      type: entry.type,
      direction: entry.direction,
      timestamp: new Date(now.getTime() - entry.ago),
      description: entry.description,
      relatedAccount: entry.relatedAccount ?? null,
      balanceAfterCents: entry.ago <= balanceAfterWithin ? balance : null,
    };
    db.transactions.push(record);
  }
}

export function createSeedDb(now: Date = new Date()): MockDb {
  const db: MockDb = {
    users: [],
    accounts: [],
    transactions: [],
    nextId: { user: 1, account: 1, transaction: 1 },
  };

  const user = (fields: Omit<UserRecord, "id" | "password">): UserRecord => {
    const record = { id: db.nextId.user++, password: DEMO_PASSWORD, ...fields };
    db.users.push(record);
    return record;
  };
  const account = (fields: Omit<AccountRecord, "id" | "balanceCents"> & { balance: number }) => {
    const { balance, ...rest } = fields;
    const record = { id: db.nextId.account++, balanceCents: Math.round(balance * 100), ...rest };
    db.accounts.push(record);
    return record;
  };

  const jane = user({
    username: "demo.jane",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    phoneNumber: "+251 911 000 001",
  });
  const john = user({
    username: "demo.john",
    firstName: "John",
    lastName: "Bekele",
    email: "john.bekele@example.com",
    phoneNumber: "+251 911 000 002",
  });
  const empty = user({
    username: "demo.empty",
    firstName: "Sara",
    lastName: "Tesfaye",
    email: null,
    phoneNumber: "+251 911 000 003",
  });

  const janeChecking = account({
    userId: jane.id,
    accountType: "CHECKING",
    accountNumber: "8751138057",
    balance: 8640,
  });
  const janeSavings = account({
    userId: jane.id,
    accountType: "SAVINGS",
    accountNumber: "4410298911",
    balance: 2200,
  });
  const johnChecking = account({
    userId: john.id,
    accountType: "CHECKING",
    accountNumber: "2899010846",
    balance: 5000,
  });
  const johnSavings = account({
    userId: john.id,
    accountType: "SAVINGS",
    accountNumber: "9402179920",
    balance: 12500,
  });
  account({ userId: empty.id, accountType: "CHECKING", accountNumber: "5120334410", balance: 0 });

  // 13 rows: more than one page at the default page size of 10.
  history(db, janeChecking, now, [
    {
      ago: 40 * DAY,
      type: "TELLER_DEPOSIT",
      direction: "CREDIT",
      amount: 5000,
      description: "Cash deposit at Bole branch",
    },
    {
      ago: 35 * DAY,
      type: "PURCHASE",
      direction: "DEBIT",
      amount: 420.5,
      description: "Purchase at Shoa Supermarket",
    },
    {
      ago: 31 * DAY,
      type: "ACCESS_FEE",
      direction: "DEBIT",
      amount: 15,
      description: "Monthly access fee",
    },
    {
      ago: 28 * DAY,
      type: "LOAN_PAYMENT",
      direction: "DEBIT",
      amount: 1200,
      description: "Loan repayment",
    },
    {
      ago: 21 * DAY,
      type: "TELLER_TRANSFER",
      direction: "CREDIT",
      amount: 2500,
      description: "Teller transfer",
    },
    {
      ago: 14 * DAY,
      type: "PURCHASE",
      direction: "DEBIT",
      amount: 89.9,
      description: "Purchase at Kaldi's Coffee",
    },
    {
      ago: 10 * DAY,
      type: "INTEREST_EARNED",
      direction: "CREDIT",
      amount: 12.4,
      description: "Interest earned",
    },
    {
      ago: 7 * DAY,
      type: "REFUND",
      direction: "CREDIT",
      amount: 89.9,
      description: "Refund from Kaldi's Coffee",
    },
    {
      ago: 3 * DAY + HOUR,
      type: "BILL_PAYMENT",
      direction: "DEBIT",
      amount: 235,
      description: "Bill Payment to Ethio Telecom",
    },
    {
      ago: 3 * DAY,
      type: "ATM_WITHDRAWAL",
      direction: "DEBIT",
      amount: 155,
      description: "ATM withdrawal",
    },
    {
      ago: 2 * DAY,
      type: "FUND_TRANSFER",
      direction: "CREDIT",
      amount: 300,
      description: "P2P Transfer from 9402179920",
      relatedAccount: johnSavings.accountNumber,
    },
    {
      ago: DAY,
      type: "ACCESS_FEE",
      direction: "DEBIT",
      amount: 15,
      description: "Monthly access fee",
    },
    {
      ago: HOUR,
      type: "REFUND",
      direction: "CREDIT",
      amount: 1665,
      description: "Refund from merchant",
    },
  ]);

  history(db, janeSavings, now, [
    {
      ago: 60 * DAY,
      type: "TELLER_DEPOSIT",
      direction: "CREDIT",
      amount: 2000,
      description: "Opening deposit",
    },
    {
      ago: 5 * DAY,
      type: "INTEREST_EARNED",
      direction: "CREDIT",
      amount: 200,
      description: "Interest earned",
    },
  ]);

  history(db, johnChecking, now, [
    {
      ago: 20 * DAY,
      type: "TELLER_DEPOSIT",
      direction: "CREDIT",
      amount: 5000,
      description: "Cash deposit",
    },
  ]);

  history(db, johnSavings, now, [
    {
      ago: 50 * DAY,
      type: "TELLER_DEPOSIT",
      direction: "CREDIT",
      amount: 12800,
      description: "Opening deposit",
    },
    {
      ago: 2 * DAY,
      type: "FUND_TRANSFER",
      direction: "DEBIT",
      amount: 300,
      description: "P2P Transfer to 8751138057",
      relatedAccount: janeChecking.accountNumber,
    },
  ]);

  return db;
}
