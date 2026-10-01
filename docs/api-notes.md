# API notes

Source: `https://challenge-api.qena.dev/v3/api-docs` (snapshot in [`api/openapi.json`](api/openapi.json), v1.1, taken 2026-10-01). Docs UI: `/scalar`.
CORS allows `http://localhost:3000`, `http://localhost:5173`, `https://*.vercel.app`.

## Endpoints

| Method | Path                                     | Auth | Body / params                                                                                                                      | Returns                                                                              | Errors                                               |
| ------ | ---------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| POST   | `/api/auth/register`                     | —    | `username` (3–50), `passwordHash` (≥6, plain password), `firstName`, `lastName`, `email?`, `phoneNumber` (`^\+?[0-9. ()-]{7,25}$`) | 201 `{message, username, userId, initialAccountNumber}`                              | VAL_001, AUTH_003, AUTH_004                          |
| POST   | `/api/auth/login`                        | —    | `username`, `passwordHash`                                                                                                         | `{message, username, userId, accessToken, refreshToken}`                             | 401 AUTH_001, 400 VAL_001                            |
| POST   | `/api/auth/refresh-token`                | —    | `refreshToken`                                                                                                                     | `{message, accessToken, refreshToken}` — **both rotate**                             | 401 AUTH_005, 400 VAL_001                            |
| GET    | `/api/users/me`                          | ✓    | —                                                                                                                                  | `{id, username, firstName, lastName, email?, phoneNumber}`                           |                                                      |
| GET    | `/api/accounts`                          | ✓    | `page` (0-based), `size` (10), `sort` (`id,ASC`), `accountNumber?`                                                                 | Page of `Account`, **or a single `Account` when `accountNumber` is given** (`oneOf`) | 403 ACC_004 if not ours                              |
| GET    | `/api/accounts/{id}`                     | ✓    | internal id                                                                                                                        | `Account`                                                                            | ACC_001, ACC_004                                     |
| POST   | `/api/accounts`                          | ✓    | `accountType`, `initialBalance` (≥0, **required** in schema; doc says defaults to 0 → always send it)                              | 201 `Account`                                                                        | VAL_001                                              |
| POST   | `/api/accounts/transfer`                 | ✓    | `fromAccountNumber`, `toAccountNumber`, `amount` (0.01–1,000,000,000), `note?` (≤140)                                              | `{message, amount, fromAccountNumber, toAccountNumber}`                              | ACC_001, ACC_002, ACC_003, ACC_004, TXN_001, VAL_001 |
| POST   | `/api/accounts/pay-bill`                 | ✓    | `accountNumber`, `biller`, `amount` (≥0.01)                                                                                        | `{message, amount, accountNumber, biller}`                                           | ACC_002, ACC_004, TXN_001, VAL_001                   |
| GET    | `/api/transactions/{accountId}`          | ✓    | **internal id**, `page`, `size`, `sort` (`timestamp,DESC`)                                                                         | Page of `Transaction`                                                                | ACC_004, ACC_001                                     |
| GET    | `/api/accounts/transfer/{transactionId}` | ✓    | —                                                                                                                                  | `Transaction` (must be FUND_TRANSFER)                                                | TXN_003, TXN_004                                     |
| GET    | `/api/accounts/pay-bill/{transactionId}` | ✓    | —                                                                                                                                  | `Transaction` (must be BILL_PAYMENT)                                                 | TXN_003, TXN_004                                     |

## Models

- **Account** `{id, accountNumber (10 digits, string), balance, userId, accountType}`
- **AccountType** `CHECKING | SAVINGS | MONEY_MARKET | INDIVIDUAL_RETIREMENT_ACCOUNT | FIXED_TIME_DEPOSIT | SPECIAL_BLOCKED_ACCOUNT`
- **Transaction** `{id, amount, type, direction, timestamp, description?, relatedAccount?, accountId, balanceAfter?}`
- **TransactionType** `FUND_TRANSFER | TELLER_TRANSFER | ATM_WITHDRAWAL | TELLER_DEPOSIT | BILL_PAYMENT | ACCESS_FEE | PURCHASE | REFUND | INTEREST_EARNED | LOAN_PAYMENT`
- **Direction** `DEBIT` (money out) | `CREDIT` (money in)
- **Page<T>** `{content, totalElements, totalPages, size, number, numberOfElements, first, last, empty}`
- **ErrorResponse** `{timestamp, status, error, code, message, path}` — `message` is never shown to users

## Error codes → user copy

Implemented in `src/shared/api/error-messages.ts` as `describeError(error, context)`, which returns the message, the form field it belongs to (if any) and whether a retry makes sense. The server's `message` is never shown; ESLint forbids reading `serverMessage` outside `src/shared/api`.

| Code            | HTTP                    | Meaning                                 | Copy                                                                                                                                                            | Field (screen)                                             |
| --------------- | ----------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| AUTH_001        | 401                     | Invalid credentials / not authenticated | Login: "Username or password is incorrect." · elsewhere: "Your session expired. Please sign in again."                                                          | —                                                          |
| AUTH_002        | 404                     | User not found                          | "We couldn't find your profile. Please sign in again."                                                                                                          | —                                                          |
| AUTH_003        | 400                     | Username exists                         | "This username is taken. Try another."                                                                                                                          | `username` (register)                                      |
| AUTH_004        | 400                     | Email exists                            | "An account with this email already exists."                                                                                                                    | `email` (register)                                         |
| AUTH_005        | 401                     | Invalid/expired token                   | "Your session expired. Please sign in again."                                                                                                                   | —                                                          |
| ACC_001         | 404                     | Account not found                       | Transfer: "Account not found. Check the number." · elsewhere: "We couldn't find this account."                                                                  | `toAccountNumber` (transfer)                               |
| ACC_002         | 400                     | Insufficient funds                      | "Insufficient funds. Available: ETB 8,640.00." (balance when known)                                                                                             | `amount` (transfer, bill)                                  |
| ACC_003         | 400                     | Same account                            | "Cannot transfer to the same account."                                                                                                                          | `toAccountNumber` (transfer)                               |
| ACC_004         | 403                     | Not your account                        | "This account isn't linked to your profile."                                                                                                                    | `fromAccountNumber` (transfer), `accountNumber` (bill)     |
| TXN_001         | 400                     | Invalid amount                          | "Enter an amount greater than ETB 0.00." · open account: "Enter an amount of ETB 0.00 or more."                                                                 | `amount` (transfer, bill), `initialBalance` (open account) |
| TXN_003         | 400                     | Wrong transaction type                  | "This receipt can't be shown here."                                                                                                                             | —                                                          |
| TXN_004         | 404                     | Transaction not found                   | "We couldn't find this transaction."                                                                                                                            | —                                                          |
| VAL_001         | 400                     | Validation                              | "Some details aren't valid. Check the highlighted fields."                                                                                                      | —                                                          |
| GEN_001         | 500                     | Server error                            | "Something went wrong on our side. Please try again." (retryable)                                                                                               | —                                                          |
| (no code)       | 5xx · 401 · 404 · other | Not an API ErrorResponse                | server error copy · session expired (or wrong credentials on login) · "We couldn't find what you were looking for." · "Something went wrong. Please try again." | —                                                          |
| (offline)       | —                       | `navigator.onLine` is false             | "You're offline. Check your connection and try again." (retryable)                                                                                              | —                                                          |
| (timeout)       | —                       | No answer within 15 s                   | "The bank is taking too long to respond. Please try again." (retryable)                                                                                         | —                                                          |
| (unreachable)   | —                       | DNS, refused connection, CORS           | "Can't reach the bank right now. Check your connection and try again." (retryable)                                                                              | —                                                          |
| (anything else) | —                       | A bug or a malformed response           | "Something went wrong. Please try again."                                                                                                                       | —                                                          |

The brief's three required transfer messages ("Insufficient funds", "Cannot transfer to the same account", "Account not found") are used word for word.

## Integration notes

1. **Receipts.** Transfer and bill responses have no transaction id, timestamp or balance. See [spec-notes N-002](spec-notes.md) and ADR-0008.
2. **UTC without offset.** `2025-06-01T10:30:00.123` is UTC. Parse with an appended `Z`. Ethiopia is UTC+3, so 22:00–23:59 UTC is "tomorrow" locally.
3. **Rotation.** Every refresh invalidates the old refresh token. Never refresh twice with the same token (in a tab or across tabs).
4. **Refresh loop guard.** A 401 from `/api/auth/refresh-token` or `/login` must not trigger another refresh.
5. **`GET /api/accounts` has two response shapes.** Typed as a union; we use separate client functions so callers never narrow.
6. **Pagination.** Default page size is 10. Total balance loops all pages (or requests `size=100` and loops if `last` is false).
7. **`initialBalance` required.** Send `0` when the field is empty.
8. **Amounts are JSON numbers.** Convert to cents on read; send as number with 2 decimals.
9. **`balanceAfter` optional.** Older rows don't have it — hide the row, don't show "ETB 0.00".
10. **`description` optional** — fall back to a label from `type` (+ `relatedAccount`).

## Demo users (from the API description)

`demo.jane` (CHECKING + SAVINGS with history) and `demo.john` (use as transfer recipient). Passwords are in the API docs. Use them sparingly — the API is shared.
