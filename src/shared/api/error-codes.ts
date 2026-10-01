/**
 * Application error codes the API returns in `ErrorResponse.code`.
 * Source: the API description in docs/api/openapi.json (see docs/api-notes.md).
 */
export const apiErrorCodes = [
  "AUTH_001", // invalid credentials / not authenticated (401)
  "AUTH_002", // user not found (404)
  "AUTH_003", // username already exists (400)
  "AUTH_004", // email already exists (400)
  "AUTH_005", // invalid or expired token (401)
  "ACC_001", // account not found (404)
  "ACC_002", // insufficient funds (400)
  "ACC_003", // transfer to the same account (400)
  "ACC_004", // account does not belong to the user (403)
  "TXN_001", // invalid amount (400)
  "TXN_003", // wrong transaction type for this endpoint (400)
  "TXN_004", // transaction not found (404)
  "VAL_001", // request validation failed (400)
  "GEN_001", // unexpected server error (500)
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (apiErrorCodes as readonly string[]).includes(value);
}
