import { http, HttpResponse, delay } from "msw";
import { z } from "zod";

import {
  type Account,
  type BillPaymentResponse,
  type Transaction,
  type TransactionType,
  type TransferResponse,
  type User,
  accountTypes,
} from "@/shared/api/types";

import {
  type AccountRecord,
  type TransactionRecord,
  fromCents,
  newAccountNumber,
  recordMovement,
  toAccount,
  toCents,
  toTransaction,
  toUser,
} from "../db";
import {
  apiUrl,
  MockApiError,
  paginate,
  parseBody,
  readJson,
  respond,
  validationError,
} from "../http";
import { getDb, requireOwnAccount, requireUser } from "../state";

// Assumptions where the API description doesn't say:
// - A missing or non-numeric amount is VAL_001; a number <= 0 is TXN_001 (invalid amount).
// - Checks run in this order: body → source account (ACC_001/ACC_004) → same account
//   (ACC_003) → destination (ACC_001) → balance (ACC_002).
// - Opening an account with an initial balance records no transaction.

const amount = z.number({ error: "amount must be a number" });

const createAccountSchema = z.object({
  accountType: z.enum(accountTypes),
  initialBalance: z.number().min(0),
});

const transferSchema = z.object({
  fromAccountNumber: z.string().min(1),
  toAccountNumber: z.string().min(1),
  amount: amount.max(1_000_000_000),
  note: z.string().max(140).nullish(),
});

const billPaymentSchema = z.object({
  accountNumber: z.string().min(1),
  biller: z.string().trim().min(1),
  amount,
});

function readId(value: string | readonly string[] | undefined, name: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw validationError(`Path variable '${name}' is invalid.`);
  return id;
}

function requirePositive(value: number): number {
  const cents = toCents(value);
  if (cents <= 0) throw new MockApiError(400, "TXN_001", "Amount must be greater than zero.");
  return cents;
}

function requireFunds(account: AccountRecord, cents: number): void {
  if (account.balanceCents < cents) {
    throw new MockApiError(
      400,
      "ACC_002",
      `Insufficient balance in account ${account.accountNumber}.`,
    );
  }
}

/** A transaction of the given type that belongs to one of the user's accounts. */
function requireOwnTransaction(
  request: Request,
  id: number,
  type: TransactionType,
): TransactionRecord {
  const user = requireUser(request);
  const db = getDb();
  const transaction = db.transactions.find((candidate) => candidate.id === id);
  if (!transaction) throw new MockApiError(404, "TXN_004", `Transaction ${id} not found.`);

  const account = db.accounts.find((candidate) => candidate.id === transaction.accountId);
  if (account?.userId !== user.id) {
    throw new MockApiError(403, "ACC_004", `Transaction ${id} does not belong to the user.`);
  }
  if (transaction.type !== type) {
    throw new MockApiError(400, "TXN_003", `Transaction ${id} is not a ${type}.`);
  }
  return transaction;
}

export const accountHandlers = [
  http.get(apiUrl("/api/users/me"), ({ request }) =>
    respond(request, async () => {
      await delay();
      return HttpResponse.json<User>(toUser(requireUser(request)));
    }),
  ),

  http.get(apiUrl("/api/accounts"), ({ request }) =>
    respond(request, async () => {
      await delay();
      const user = requireUser(request);
      const url = new URL(request.url);

      // With ?accountNumber= the API returns one account instead of a page.
      const accountNumber = url.searchParams.get("accountNumber");
      if (accountNumber !== null) {
        const account = requireOwnAccount(
          user,
          (candidate) => candidate.accountNumber === accountNumber,
          accountNumber,
        );
        return HttpResponse.json<Account>(toAccount(account));
      }

      const own = getDb().accounts.filter((account) => account.userId === user.id);
      const page = paginate(own, url, {
        defaultSort: "id,ASC",
        sortFields: {
          id: (account) => account.id,
          balance: (account) => account.balanceCents,
          accountType: (account) => account.accountType,
          accountNumber: (account) => account.accountNumber,
        },
      });
      return HttpResponse.json({ ...page, content: page.content.map(toAccount) });
    }),
  ),

  http.post(apiUrl("/api/accounts"), ({ request }) =>
    respond(request, async () => {
      await delay();
      const user = requireUser(request);
      const body = parseBody(createAccountSchema, await readJson(request));
      const db = getDb();

      const account: AccountRecord = {
        id: db.nextId.account++,
        accountNumber: newAccountNumber(db),
        balanceCents: toCents(body.initialBalance),
        userId: user.id,
        accountType: body.accountType,
      };
      db.accounts.push(account);
      return HttpResponse.json<Account>(toAccount(account), { status: 201 });
    }),
  ),

  http.post(apiUrl("/api/accounts/transfer"), ({ request }) =>
    respond(request, async () => {
      await delay();
      const user = requireUser(request);
      const body = parseBody(transferSchema, await readJson(request));
      const cents = requirePositive(body.amount);

      const from = requireOwnAccount(
        user,
        (account) => account.accountNumber === body.fromAccountNumber,
        body.fromAccountNumber,
      );
      if (body.toAccountNumber === body.fromAccountNumber) {
        throw new MockApiError(400, "ACC_003", "Cannot transfer to the same account.");
      }
      const db = getDb();
      const to = db.accounts.find((account) => account.accountNumber === body.toAccountNumber);
      if (!to) throw new MockApiError(404, "ACC_001", `Account ${body.toAccountNumber} not found.`);
      requireFunds(from, cents);

      // The note, when given, becomes the description on both sides.
      const note = body.note?.trim() || null;
      const timestamp = new Date();
      recordMovement(db, from, {
        amountCents: cents,
        type: "FUND_TRANSFER",
        direction: "DEBIT",
        description: note ?? `P2P Transfer to ${to.accountNumber}`,
        relatedAccount: to.accountNumber,
        timestamp,
      });
      recordMovement(db, to, {
        amountCents: cents,
        type: "FUND_TRANSFER",
        direction: "CREDIT",
        description: note ?? `P2P Transfer from ${from.accountNumber}`,
        relatedAccount: from.accountNumber,
        timestamp,
      });

      return HttpResponse.json<TransferResponse>({
        message: "Transfer successful.",
        amount: fromCents(cents),
        fromAccountNumber: from.accountNumber,
        toAccountNumber: to.accountNumber,
      });
    }),
  ),

  http.post(apiUrl("/api/accounts/pay-bill"), ({ request }) =>
    respond(request, async () => {
      await delay();
      const user = requireUser(request);
      const body = parseBody(billPaymentSchema, await readJson(request));
      const cents = requirePositive(body.amount);
      const account = requireOwnAccount(
        user,
        (candidate) => candidate.accountNumber === body.accountNumber,
        body.accountNumber,
      );
      requireFunds(account, cents);

      recordMovement(getDb(), account, {
        amountCents: cents,
        type: "BILL_PAYMENT",
        direction: "DEBIT",
        description: `Bill Payment to ${body.biller}`,
      });

      return HttpResponse.json<BillPaymentResponse>({
        message: "Bill payment successful.",
        amount: fromCents(cents),
        accountNumber: account.accountNumber,
        biller: body.biller,
      });
    }),
  ),

  http.get(apiUrl("/api/accounts/transfer/:transactionId"), ({ request, params }) =>
    respond(request, async () => {
      await delay();
      const id = readId(params.transactionId, "transactionId");
      return HttpResponse.json<Transaction>(
        toTransaction(requireOwnTransaction(request, id, "FUND_TRANSFER")),
      );
    }),
  ),

  http.get(apiUrl("/api/accounts/pay-bill/:transactionId"), ({ request, params }) =>
    respond(request, async () => {
      await delay();
      const id = readId(params.transactionId, "transactionId");
      return HttpResponse.json<Transaction>(
        toTransaction(requireOwnTransaction(request, id, "BILL_PAYMENT")),
      );
    }),
  ),

  http.get(apiUrl("/api/accounts/:id"), ({ request, params }) =>
    respond(request, async () => {
      await delay();
      const user = requireUser(request);
      const id = readId(params.id, "id");
      return HttpResponse.json<Account>(
        toAccount(requireOwnAccount(user, (account) => account.id === id, String(id))),
      );
    }),
  ),

  http.get(apiUrl("/api/transactions/:accountId"), ({ request, params }) =>
    respond(request, async () => {
      await delay();
      const user = requireUser(request);
      const accountId = readId(params.accountId, "accountId");
      requireOwnAccount(user, (account) => account.id === accountId, String(accountId));

      const rows = getDb().transactions.filter((row) => row.accountId === accountId);
      const page = paginate(rows, new URL(request.url), {
        defaultSort: "timestamp,DESC",
        sortFields: {
          // Ties (both sides of one transfer share a timestamp) fall back to id order.
          timestamp: (row) =>
            `${String(row.timestamp.getTime()).padStart(15, "0")}:${String(row.id).padStart(10, "0")}`,
          amount: (row) => row.amountCents,
          id: (row) => row.id,
        },
      });
      return HttpResponse.json({ ...page, content: page.content.map(toTransaction) });
    }),
  ),
];
