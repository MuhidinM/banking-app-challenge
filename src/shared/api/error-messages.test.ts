import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { toCents } from "@/shared/lib/money";

import { ApiError, NetworkError } from "./api-error";
import { apiErrorCodes } from "./error-codes";
import { MESSAGES, describeError } from "./error-messages";

import type { ApiErrorCode } from "./error-codes";

const api = (code: ApiErrorCode | "UNKNOWN", status = 400) =>
  new ApiError({ status, code, serverMessage: "RAW SERVER TEXT 1000000001" });

describe("describeError: the brief's required transfer messages", () => {
  it("says Insufficient funds, on the amount field, with the available balance", () => {
    expect(describeError(api("ACC_002"), "transfer", { availableCents: toCents(8640) })).toEqual({
      message: "Insufficient funds. Available: ETB 8,640.00.",
      field: "amount",
      retryable: false,
    });
    expect(describeError(api("ACC_002"), "transfer").message).toBe("Insufficient funds.");
  });

  it("says Cannot transfer to the same account, on the recipient field", () => {
    expect(describeError(api("ACC_003"), "transfer")).toMatchObject({
      message: "Cannot transfer to the same account.",
      field: "toAccountNumber",
    });
  });

  it("says Account not found, on the recipient field", () => {
    expect(describeError(api("ACC_001", 404), "transfer")).toMatchObject({
      message: "Account not found. Check the number.",
      field: "toAccountNumber",
    });
  });
});

describe("describeError: codes by screen", () => {
  it.each([
    // [code, context, message, field]
    ["AUTH_001", "login", "Username or password is incorrect.", undefined],
    ["AUTH_001", "load", MESSAGES.sessionExpired, undefined],
    ["AUTH_002", "load", "We couldn't find your profile. Please sign in again.", undefined],
    ["AUTH_003", "register", "This username is taken. Try another.", "username"],
    ["AUTH_004", "register", "An account with this email already exists.", "email"],
    ["AUTH_005", "load", MESSAGES.sessionExpired, undefined],
    ["ACC_001", "load", "We couldn't find this account.", undefined],
    ["ACC_002", "bill", "Insufficient funds.", "amount"],
    ["ACC_004", "transfer", "This account isn't linked to your profile.", "fromAccountNumber"],
    ["ACC_004", "bill", "This account isn't linked to your profile.", "accountNumber"],
    ["TXN_001", "transfer", "Enter an amount greater than ETB 0.00.", "amount"],
    ["TXN_001", "openAccount", "Enter an amount of ETB 0.00 or more.", "initialBalance"],
    ["TXN_003", "load", "This receipt can't be shown here.", undefined],
    ["TXN_004", "load", "We couldn't find this transaction.", undefined],
    ["VAL_001", "register", MESSAGES.validation, undefined],
    ["GEN_001", "load", MESSAGES.server, undefined],
  ] as const)("%s on %s → %j", (code, context, message, field) => {
    const described = describeError(api(code), context);
    expect(described.message).toBe(message);
    expect(described.field).toBe(field);
  });

  it("has copy for every code the API documents, on every screen", () => {
    const contexts = ["login", "register", "transfer", "bill", "openAccount", "load"] as const;
    for (const code of apiErrorCodes) {
      for (const context of contexts) {
        const { message } = describeError(api(code), context);
        expect(message.length).toBeGreaterThan(5);
        expect(message).not.toBe(MESSAGES.unknown);
      }
    }
  });

  it("never passes on the server's text", () => {
    for (const code of [...apiErrorCodes, "UNKNOWN" as const]) {
      expect(describeError(api(code), "transfer").message).not.toContain("RAW SERVER TEXT");
    }
  });

  it("only suggests retrying when a retry could work", () => {
    expect(describeError(api("GEN_001", 500), "load").retryable).toBe(true);
    expect(describeError(api("ACC_002"), "transfer").retryable).toBe(false);
    expect(describeError(api("VAL_001"), "register").retryable).toBe(false);
  });
});

describe("describeError: network failures", () => {
  it.each([
    ["offline", MESSAGES.offline],
    ["timeout", MESSAGES.timeout],
    ["unreachable", MESSAGES.unreachable],
  ] as const)("%s → %j, retryable", (reason, message) => {
    expect(describeError(new NetworkError(reason), "transfer")).toEqual({
      message,
      retryable: true,
    });
  });
});

describe("describeError: responses without a usable code", () => {
  it.each([
    [502, "load", MESSAGES.server, true],
    [401, "login", "Username or password is incorrect.", false],
    [401, "load", MESSAGES.sessionExpired, false],
    [404, "load", MESSAGES.notFound, false],
    [418, "load", MESSAGES.unknown, false],
  ] as const)("status %d on %s → %j", (status, context, message, retryable) => {
    expect(describeError(api("UNKNOWN", status), context)).toEqual({ message, retryable });
  });
});

describe("describeError: anything else", () => {
  it("gives the generic message for bugs and malformed responses", () => {
    expect(describeError(new TypeError("x is undefined"), "load").message).toBe(MESSAGES.unknown);
    expect(describeError(new ZodError([]), "login").message).toBe(MESSAGES.unknown);
    expect(describeError("a string", "load").message).toBe(MESSAGES.unknown);
  });
});
