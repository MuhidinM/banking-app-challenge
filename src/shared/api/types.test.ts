import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type Account,
  type AccountType,
  type Page,
  type Transaction,
  type TransferRequest,
  accountTypes,
  transactionDirections,
  transactionTypes,
} from "./types";

// Type assertions are checked by `pnpm typecheck`; the runtime assertions by `pnpm test`.
describe("generated API types", () => {
  it("lists every account type the API accepts", () => {
    expect(accountTypes).toEqual([
      "CHECKING",
      "SAVINGS",
      "MONEY_MARKET",
      "INDIVIDUAL_RETIREMENT_ACCOUNT",
      "FIXED_TIME_DEPOSIT",
      "SPECIAL_BLOCKED_ACCOUNT",
    ]);
    expectTypeOf<(typeof accountTypes)[number]>().toEqualTypeOf<AccountType>();
  });

  it("lists every transaction type and both directions", () => {
    expect(transactionTypes).toHaveLength(10);
    expect(transactionTypes).toContain("FUND_TRANSFER");
    expect(transactionTypes).toContain("BILL_PAYMENT");
    expect(transactionDirections).toEqual(["DEBIT", "CREDIT"]);
  });

  it("keeps the API's optional and nullable fields optional", () => {
    // Older transactions have no balanceAfter; transfers may lack a description.
    expectTypeOf<Transaction["balanceAfter"]>().toEqualTypeOf<number | null | undefined>();
    expectTypeOf<Transaction["description"]>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<TransferRequest["note"]>().toEqualTypeOf<string | null | undefined>();
  });

  it("types account numbers as strings and ids as numbers", () => {
    // Account numbers can start with 0, so they must never become numbers.
    expectTypeOf<Account["accountNumber"]>().toBeString();
    expectTypeOf<Account["id"]>().toBeNumber();
  });

  it("types a page of items generically", () => {
    expectTypeOf<Page<Account>["content"]>().toEqualTypeOf<Account[]>();
    expectTypeOf<Page<Transaction>["last"]>().toBeBoolean();
  });
});
