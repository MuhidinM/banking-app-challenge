/**
 * Turns any failure into words a customer can act on (docs/api-notes.md,
 * "Error codes → user copy"). The brief: errors come from the API code plus a
 * generic network-failure message, and raw backend text is never shown.
 * `ApiError.serverMessage` is never used here (ESLint forbids reading it
 * outside src/shared/api).
 *
 * The same code can mean different things on different screens: AUTH_001 is
 * "wrong password" on the login form but "your session ended" anywhere else.
 * Errors that belong to one form field say which, so the form can show them
 * next to it.
 */
import { type Cents, formatMoney } from "@/shared/lib/money";

import { isApiError, isNetworkError } from "./api-error";

import type { ApiErrorCode } from "./error-codes";

/** Form fields an error can be attached to, per screen (named like the API request fields). */
export interface FieldsByContext {
  login: never;
  register: "username" | "email" | "passwordHash" | "phoneNumber";
  transfer: "fromAccountNumber" | "toAccountNumber" | "amount" | "note";
  bill: "accountNumber" | "biller" | "amount";
  openAccount: "accountType" | "initialBalance";
  /** Loading data (lists, details, receipts): no form. */
  load: never;
}

export type ErrorContext = keyof FieldsByContext;

export interface ErrorDescription<Field extends string = string> {
  message: string;
  /** Show the message on this form field instead of at the top of the form. */
  field?: Field;
  /** A "Try again" makes sense: the request might work a moment later. */
  retryable: boolean;
}

export interface DescribeErrorOptions {
  /** For "Insufficient funds. Available: ETB 8,640.00." */
  availableCents?: Cents | undefined;
}

export const MESSAGES = {
  offline: "You're offline. Check your connection and try again.",
  timeout: "The bank is taking too long to respond. Please try again.",
  unreachable: "Can't reach the bank right now. Check your connection and try again.",
  server: "Something went wrong on our side. Please try again.",
  unknown: "Something went wrong. Please try again.",
  notFound: "We couldn't find what you were looking for.",
  sessionExpired: "Your session expired. Please sign in again.",
  wrongCredentials: "Username or password is incorrect.",
  validation: "Some details aren't valid. Check the highlighted fields.",
} as const;

/**
 * Which field each code belongs to, per screen. The compiler checks every
 * value against that screen's fields, so a transfer error can't point at a
 * registration field.
 */
const fieldFor: { [C in ErrorContext]: Partial<Record<ApiErrorCode, FieldsByContext[C]>> } = {
  login: {},
  register: { AUTH_003: "username", AUTH_004: "email" },
  transfer: {
    ACC_001: "toAccountNumber",
    ACC_002: "amount",
    ACC_003: "toAccountNumber",
    ACC_004: "fromAccountNumber",
    TXN_001: "amount",
  },
  bill: { ACC_002: "amount", ACC_004: "accountNumber", TXN_001: "amount" },
  openAccount: { TXN_001: "initialBalance" },
  load: {},
};

function messageFor(
  code: ApiErrorCode,
  context: ErrorContext,
  options: DescribeErrorOptions,
): string {
  switch (code) {
    case "AUTH_001":
      return context === "login" ? MESSAGES.wrongCredentials : MESSAGES.sessionExpired;
    case "AUTH_002":
      return "We couldn't find your profile. Please sign in again.";
    case "AUTH_003":
      return context === "register"
        ? "This username is taken. Try another."
        : "This username is taken.";
    case "AUTH_004":
      return "An account with this email already exists.";
    case "AUTH_005":
      return MESSAGES.sessionExpired;
    case "ACC_001":
      // The brief requires "Account not found" for transfers.
      return context === "transfer"
        ? "Account not found. Check the number."
        : "We couldn't find this account.";
    case "ACC_002": {
      // The brief requires "Insufficient funds".
      const { availableCents } = options;
      return availableCents === undefined
        ? "Insufficient funds."
        : `Insufficient funds. Available: ${formatMoney(availableCents)}.`;
    }
    case "ACC_003":
      // The brief requires "Cannot transfer to the same account".
      return "Cannot transfer to the same account.";
    case "ACC_004":
      return "This account isn't linked to your profile.";
    case "TXN_001":
      return context === "openAccount"
        ? "Enter an amount of ETB 0.00 or more."
        : "Enter an amount greater than ETB 0.00.";
    case "TXN_003":
      return "This receipt can't be shown here.";
    case "TXN_004":
      return "We couldn't find this transaction.";
    case "VAL_001":
      return MESSAGES.validation;
    case "GEN_001":
      return MESSAGES.server;
  }
}

/** Copy for an ApiError without a usable code (e.g. a proxy's HTML error page), by status. */
function messageForStatus(status: number, context: ErrorContext): string {
  if (status >= 500) return MESSAGES.server;
  if (status === 401)
    return context === "login" ? MESSAGES.wrongCredentials : MESSAGES.sessionExpired;
  if (status === 404) return MESSAGES.notFound;
  return MESSAGES.unknown;
}

/**
 * User-facing copy for any thrown value: ApiError, NetworkError, or anything
 * else (a bug, a malformed response), which gets the generic message.
 */
export function describeError<C extends ErrorContext>(
  error: unknown,
  context: C,
  options: DescribeErrorOptions = {},
): ErrorDescription<FieldsByContext[C]> {
  if (isNetworkError(error)) {
    return { message: MESSAGES[error.reason], retryable: true };
  }

  if (isApiError(error)) {
    if (error.code === "UNKNOWN") {
      return { message: messageForStatus(error.status, context), retryable: error.status >= 500 };
    }
    const field = fieldFor[context][error.code];
    return {
      message: messageFor(error.code, context, options),
      ...(field === undefined ? {} : { field }),
      retryable: error.code === "GEN_001",
    };
  }

  return { message: MESSAGES.unknown, retryable: true };
}
