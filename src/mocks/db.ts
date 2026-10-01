import type {
  Account,
  AccountType,
  Transaction,
  TransactionDirection,
  TransactionType,
  User,
} from "@/shared/api/types";

import { apiTimestamp } from "./http";

// Records keep money in integer cents so balances never drift; they are
// converted to the API's 2-decimal numbers only when serialised.

export interface UserRecord {
  id: number;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string;
}

export interface AccountRecord {
  id: number;
  accountNumber: string;
  balanceCents: number;
  userId: number;
  accountType: AccountType;
}

export interface TransactionRecord {
  id: number;
  accountId: number;
  amountCents: number;
  type: TransactionType;
  direction: TransactionDirection;
  timestamp: Date;
  description: string | null;
  relatedAccount: string | null;
  /** `null` mimics older rows recorded before the API added balanceAfter. */
  balanceAfterCents: number | null;
}

export interface MockDb {
  users: UserRecord[];
  accounts: AccountRecord[];
  transactions: TransactionRecord[];
  nextId: { user: number; account: number; transaction: number };
}

export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => cents / 100;

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    username: record.username,
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    phoneNumber: record.phoneNumber,
  };
}

export function toAccount(record: AccountRecord): Account {
  return {
    id: record.id,
    accountNumber: record.accountNumber,
    balance: fromCents(record.balanceCents),
    userId: record.userId,
    accountType: record.accountType,
  };
}

export function toTransaction(record: TransactionRecord): Transaction {
  return {
    id: record.id,
    accountId: record.accountId,
    amount: fromCents(record.amountCents),
    type: record.type,
    direction: record.direction,
    timestamp: apiTimestamp(record.timestamp),
    description: record.description,
    relatedAccount: record.relatedAccount,
    ...(record.balanceAfterCents === null
      ? {}
      : { balanceAfter: fromCents(record.balanceAfterCents) }),
  };
}

/** A 10-digit account number not used by any account yet. */
export function newAccountNumber(db: MockDb): string {
  for (;;) {
    const candidate = String(Math.floor(1_000_000_000 + Math.random() * 9_000_000_000));
    if (!db.accounts.some((account) => account.accountNumber === candidate)) return candidate;
  }
}

/** Moves money on an account and records the transaction, with balanceAfter. */
export function recordMovement(
  db: MockDb,
  account: AccountRecord,
  movement: {
    amountCents: number;
    type: TransactionType;
    direction: TransactionDirection;
    description: string | null;
    relatedAccount?: string | null;
    timestamp?: Date;
  },
): TransactionRecord {
  account.balanceCents +=
    movement.direction === "CREDIT" ? movement.amountCents : -movement.amountCents;

  const record: TransactionRecord = {
    id: db.nextId.transaction++,
    accountId: account.id,
    amountCents: movement.amountCents,
    type: movement.type,
    direction: movement.direction,
    timestamp: movement.timestamp ?? new Date(),
    description: movement.description,
    relatedAccount: movement.relatedAccount ?? null,
    balanceAfterCents: account.balanceCents,
  };
  db.transactions.push(record);
  return record;
}
