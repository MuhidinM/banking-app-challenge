import { type AccountRecord, type MockDb, type UserRecord } from "./db";
import { createSeedDb } from "./fixtures";
import { MockApiError } from "./http";
import { checkAccessToken, resetTokens } from "./tokens";

let db: MockDb = createSeedDb();

/** The mock bank's current data. Changes made by requests last until `resetMockApi()`. */
export function getDb(): MockDb {
  return db;
}

/** Restores the seed data and forgets every issued token. Tests call this after each test. */
export function resetMockApi(now: Date = new Date()): void {
  db = createSeedDb(now);
  resetTokens();
}

/**
 * The signed-in user for a protected request, or an API error like the real one:
 * no bearer token → 401 AUTH_001; unknown or expired token → 401 AUTH_005.
 */
export function requireUser(request: Request): UserRecord {
  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    throw new MockApiError(
      401,
      "AUTH_001",
      "Full authentication is required to access this resource.",
    );
  }

  const check = checkAccessToken(token);
  if (!check.ok) {
    throw new MockApiError(
      401,
      "AUTH_005",
      check.reason === "expired" ? "Access token has expired." : "Access token is invalid.",
    );
  }

  const user = db.users.find((candidate) => candidate.id === check.userId);
  if (!user) throw new MockApiError(404, "AUTH_002", "User not found.");
  return user;
}

/**
 * Finds an account by a predicate and checks the user owns it:
 * missing → 404 ACC_001; someone else's → 403 ACC_004.
 */
export function requireOwnAccount(
  user: UserRecord,
  find: (account: AccountRecord) => boolean,
  label: string,
): AccountRecord {
  const account = db.accounts.find(find);
  if (!account) throw new MockApiError(404, "ACC_001", `Account ${label} not found.`);
  if (account.userId !== user.id) {
    throw new MockApiError(403, "ACC_004", `Account ${label} does not belong to the user.`);
  }
  return account;
}
