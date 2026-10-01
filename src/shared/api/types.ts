/**
 * Named API types, taken from the schema generated from docs/api/openapi.json.
 *
 * Import API types from here, not from ./schema, so call sites read as
 * `Account` instead of `components["schemas"]["AccountResponse"]`.
 * After the API changes: `pnpm api:snapshot`, review the diff, `pnpm api:types`.
 */
import type { components } from "./schema";

type Schemas = components["schemas"];

// Resources
export type User = Schemas["UserResponse"];
export type Account = Schemas["AccountResponse"];
export type AccountType = Account["accountType"];
export type Transaction = Schemas["TransactionResponse"];
export type TransactionType = Transaction["type"];
export type TransactionDirection = Transaction["direction"];

/** Paged list response: `{ content, totalElements, totalPages, number, last, ... }`; `number` is 0-based. */
export type Page<T> = Omit<Schemas["PageAccountResponse"], "content"> & { content: T[] };

/** Body of every failed request. `message` is for logs only and is never shown to users. */
export type ApiErrorBody = Schemas["ErrorResponse"];

// Auth
export type LoginRequest = Schemas["LoginRequest"];
export type LoginResponse = Schemas["LoginResponse"];
export type RegisterRequest = Schemas["RegisterRequest"];
export type RegisterResponse = Schemas["RegisterResponse"];
export type RefreshTokenRequest = Schemas["RefreshTokenRequest"];
export type RefreshTokenResponse = Schemas["RefreshTokenResponse"];

// Money movement
export type CreateAccountRequest = Schemas["CreateAccountRequest"];
export type TransferRequest = Schemas["TransferRequest"];
export type TransferResponse = Schemas["TransferResponse"];
export type BillPaymentRequest = Schemas["BillPaymentRequest"];
export type BillPaymentResponse = Schemas["BillPaymentResponse"];

// Every value of each API enum, in the order the API documents them.
export {
  accountResponseAccountTypeValues as accountTypes,
  transactionResponseTypeValues as transactionTypes,
  transactionResponseDirectionValues as transactionDirections,
} from "./schema";
