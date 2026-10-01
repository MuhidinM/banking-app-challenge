import { describe, expect, it } from "vitest";

import type {
  Account,
  ApiErrorBody,
  LoginResponse,
  Page,
  RefreshTokenResponse,
  Transaction,
  User,
} from "@/shared/api/types";

import { DEMO_PASSWORD } from "../fixtures";
import { apiUrl } from "../http";
import { expireAccessTokens, expireRefreshTokens } from "../tokens";

// These tests pin the mock to the real API's contract (docs/api-notes.md), so
// tests written against the mock stay meaningful against the hosted API.

const JANE_CHECKING = "8751138057";
const JANE_SAVINGS = "4410298911";
const JOHN_CHECKING = "2899010846";

async function call(
  method: string,
  path: `/api/${string}`,
  options: { token?: string; body?: unknown } = {},
) {
  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

async function login(username = "demo.jane"): Promise<LoginResponse> {
  const { status, body } = await call("POST", "/api/auth/login", {
    body: { username, passwordHash: DEMO_PASSWORD },
  });
  expect(status).toBe(200);
  return body as LoginResponse;
}

async function accountsOf(token: string): Promise<Account[]> {
  const { body } = await call("GET", "/api/accounts", { token });
  return (body as Page<Account>).content;
}

function expectError(result: { status: number; body: unknown }, status: number, code: string) {
  expect(result.status).toBe(status);
  const error = result.body as ApiErrorBody;
  expect(error).toMatchObject({ status, code });
  expect(error.timestamp).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}$/);
  expect(error.path).toMatch(/^\/api\//);
}

describe("mock API · authentication", () => {
  it("logs a demo user in with an access and a refresh token", async () => {
    const session = await login();
    expect(session).toMatchObject({ username: "demo.jane", userId: 1 });
    expect(session.accessToken.split(".")).toHaveLength(3);
    expect(session.refreshToken).not.toBe(session.accessToken);
  });

  it("rejects a wrong password with AUTH_001", async () => {
    const result = await call("POST", "/api/auth/login", {
      body: { username: "demo.jane", passwordHash: "wrong" },
    });
    expectError(result, 401, "AUTH_001");
  });

  it("requires a bearer token (AUTH_001) and rejects unknown ones (AUTH_005)", async () => {
    expectError(await call("GET", "/api/users/me"), 401, "AUTH_001");
    expectError(await call("GET", "/api/users/me", { token: "not-a-token" }), 401, "AUTH_005");
  });

  it("returns 401 AUTH_005 once the access token has expired", async () => {
    const { accessToken } = await login();
    expireAccessTokens();
    expectError(await call("GET", "/api/users/me", { token: accessToken }), 401, "AUTH_005");
  });

  it("rotates both tokens on refresh, and the old refresh token stops working", async () => {
    const first = await login();
    const refreshed = await call("POST", "/api/auth/refresh-token", {
      body: { refreshToken: first.refreshToken },
    });
    expect(refreshed.status).toBe(200);
    const next = refreshed.body as RefreshTokenResponse;
    expect(next.accessToken).not.toBe(first.accessToken);
    expect(next.refreshToken).not.toBe(first.refreshToken);

    const me = await call("GET", "/api/users/me", { token: next.accessToken });
    expect((me.body as User).username).toBe("demo.jane");

    const reused = await call("POST", "/api/auth/refresh-token", {
      body: { refreshToken: first.refreshToken },
    });
    expectError(reused, 401, "AUTH_005");
  });

  it("rejects an expired refresh token with AUTH_005", async () => {
    const { refreshToken } = await login();
    expireRefreshTokens();
    const result = await call("POST", "/api/auth/refresh-token", { body: { refreshToken } });
    expectError(result, 401, "AUTH_005");
  });

  it("registers a user with an empty CHECKING account and can log them in", async () => {
    const result = await call("POST", "/api/auth/register", {
      body: {
        username: "new.user",
        passwordHash: "secret1",
        firstName: "New",
        lastName: "User",
        phoneNumber: "+251 911 222 333",
      },
    });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ username: "new.user" });

    const loggedIn = await call("POST", "/api/auth/login", {
      body: { username: "new.user", passwordHash: "secret1" },
    });
    const accounts = await accountsOf((loggedIn.body as LoginResponse).accessToken);
    expect(accounts).toEqual([expect.objectContaining({ accountType: "CHECKING", balance: 0 })]);
  });

  it("reports duplicate usernames (AUTH_003), emails (AUTH_004) and invalid fields (VAL_001)", async () => {
    const base = {
      passwordHash: "secret1",
      firstName: "A",
      lastName: "B",
      phoneNumber: "0911000000",
    };
    expectError(
      await call("POST", "/api/auth/register", { body: { ...base, username: "demo.jane" } }),
      400,
      "AUTH_003",
    );
    expectError(
      await call("POST", "/api/auth/register", {
        body: { ...base, username: "someone", email: "jane.doe@example.com" },
      }),
      400,
      "AUTH_004",
    );
    expectError(
      await call("POST", "/api/auth/register", { body: { ...base, username: "ab" } }),
      400,
      "VAL_001",
    );
  });
});

describe("mock API · accounts", () => {
  it("lists only the user's accounts, as a page", async () => {
    const { accessToken } = await login();
    const { body } = await call("GET", "/api/accounts", { token: accessToken });
    const page = body as Page<Account>;
    expect(page).toMatchObject({ totalElements: 2, number: 0, first: true, last: true });
    expect(page.content.map((account) => account.accountNumber)).toEqual([
      JANE_CHECKING,
      JANE_SAVINGS,
    ]);
    expect(page.content[0]?.balance).toBe(8640);
  });

  it("finds one own account by number, but not someone else's", async () => {
    const { accessToken } = await login();
    const own = await call("GET", `/api/accounts?accountNumber=${JANE_SAVINGS}`, {
      token: accessToken,
    });
    expect(own.body).toMatchObject({ accountNumber: JANE_SAVINGS, accountType: "SAVINGS" });

    const other = await call("GET", `/api/accounts?accountNumber=${JOHN_CHECKING}`, {
      token: accessToken,
    });
    expectError(other, 403, "ACC_004");
  });

  it("opens a new account with an initial balance", async () => {
    const { accessToken } = await login();
    const created = await call("POST", "/api/accounts", {
      token: accessToken,
      body: { accountType: "MONEY_MARKET", initialBalance: 50 },
    });
    expect(created.status).toBe(201);
    const account = created.body as Account;
    expect(account).toMatchObject({ accountType: "MONEY_MARKET", balance: 50 });
    expect(account.accountNumber).toMatch(/^\d{10}$/);
    expect(await accountsOf(accessToken)).toHaveLength(3);
  });
});

describe("mock API · transfers and bills", () => {
  it("moves money, records both sides with the note, and sets balanceAfter", async () => {
    const { accessToken } = await login();
    const result = await call("POST", "/api/accounts/transfer", {
      token: accessToken,
      body: {
        fromAccountNumber: JANE_CHECKING,
        toAccountNumber: JOHN_CHECKING,
        amount: 250,
        note: "Rent for September",
      },
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ amount: 250, toAccountNumber: JOHN_CHECKING });

    const [checking] = await accountsOf(accessToken);
    expect(checking?.balance).toBe(8390);

    const history = await call("GET", `/api/transactions/${checking?.id}`, { token: accessToken });
    const [latest] = (history.body as Page<Transaction>).content;
    expect(latest).toMatchObject({
      type: "FUND_TRANSFER",
      direction: "DEBIT",
      amount: 250,
      description: "Rent for September",
      relatedAccount: JOHN_CHECKING,
      balanceAfter: 8390,
    });

    const john = await login("demo.john");
    const johnChecking = (await accountsOf(john.accessToken)).find(
      (account) => account.accountNumber === JOHN_CHECKING,
    );
    expect(johnChecking?.balance).toBe(5250);
  });

  it("keeps cents exact", async () => {
    const { accessToken } = await login();
    for (const amount of [0.1, 0.2]) {
      await call("POST", "/api/accounts/pay-bill", {
        token: accessToken,
        body: { accountNumber: JANE_CHECKING, biller: "Ethio Telecom", amount },
      });
    }
    expect((await accountsOf(accessToken))[0]?.balance).toBe(8639.7);
  });

  it.each([
    ["insufficient funds", { amount: 9000 }, 400, "ACC_002"],
    ["the same account", { toAccountNumber: JANE_CHECKING }, 400, "ACC_003"],
    ["an unknown recipient", { toAccountNumber: "0000000000" }, 404, "ACC_001"],
    ["someone else's source account", { fromAccountNumber: JOHN_CHECKING }, 403, "ACC_004"],
    ["a zero amount", { amount: 0 }, 400, "TXN_001"],
    ["a note over 140 characters", { note: "x".repeat(141) }, 400, "VAL_001"],
    ["a missing amount", { amount: undefined }, 400, "VAL_001"],
  ])("rejects a transfer with %s", async (_case, override, status, code) => {
    const { accessToken } = await login();
    const result = await call("POST", "/api/accounts/transfer", {
      token: accessToken,
      body: {
        fromAccountNumber: JANE_CHECKING,
        toAccountNumber: JOHN_CHECKING,
        amount: 100,
        ...override,
      },
    });
    expectError(result, status, code);
  });

  it("pays a bill, or rejects it for insufficient funds", async () => {
    const { accessToken } = await login();
    const paid = await call("POST", "/api/accounts/pay-bill", {
      token: accessToken,
      body: { accountNumber: JANE_SAVINGS, biller: "Ethio Telecom", amount: 75 },
    });
    expect(paid.body).toMatchObject({ amount: 75, biller: "Ethio Telecom" });

    const tooMuch = await call("POST", "/api/accounts/pay-bill", {
      token: accessToken,
      body: { accountNumber: JANE_SAVINGS, biller: "Ethio Telecom", amount: 9000 },
    });
    expectError(tooMuch, 400, "ACC_002");
  });
});

describe("mock API · transactions", () => {
  it("pages history newest first, in UTC without an offset", async () => {
    const { accessToken } = await login();
    const [checking] = await accountsOf(accessToken);
    const first = await call("GET", `/api/transactions/${checking?.id}`, { token: accessToken });
    const page = first.body as Page<Transaction>;

    expect(page).toMatchObject({ totalElements: 13, totalPages: 2, size: 10, last: false });
    expect(page.content[0]).toMatchObject({ description: "Refund from merchant", amount: 1665 });
    expect(page.content[0]?.timestamp).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}$/);
    const times = page.content.map((row) => row.timestamp);
    expect(times).toEqual([...times].sort().reverse());

    const second = await call("GET", `/api/transactions/${checking?.id}?page=1`, {
      token: accessToken,
    });
    expect(second.body).toMatchObject({ number: 1, numberOfElements: 3, last: true });
  });

  it("leaves balanceAfter out of older rows, like the real API", async () => {
    const { accessToken } = await login();
    const [checking] = await accountsOf(accessToken);
    const { body } = await call("GET", `/api/transactions/${checking?.id}?size=20`, {
      token: accessToken,
    });
    const rows = (body as Page<Transaction>).content;
    expect(rows[0]?.balanceAfter).toBe(8640);
    expect(rows.at(-1)).not.toHaveProperty("balanceAfter");
  });

  it("does not show another user's history (ACC_004)", async () => {
    const { accessToken } = await login("demo.john");
    expectError(await call("GET", "/api/transactions/1", { token: accessToken }), 403, "ACC_004");
  });

  it("fetches a transfer by id, and rejects other types (TXN_003) or unknown ids (TXN_004)", async () => {
    const { accessToken } = await login();
    const [checking] = await accountsOf(accessToken);
    const { body } = await call("GET", `/api/transactions/${checking?.id}?size=20`, {
      token: accessToken,
    });
    const rows = (body as Page<Transaction>).content;
    const transfer = rows.find((row) => row.type === "FUND_TRANSFER");
    const refund = rows.find((row) => row.type === "REFUND");

    const found = await call("GET", `/api/accounts/transfer/${transfer?.id}`, {
      token: accessToken,
    });
    expect(found.body).toMatchObject({ id: transfer?.id, type: "FUND_TRANSFER" });
    expectError(
      await call("GET", `/api/accounts/transfer/${refund?.id}`, { token: accessToken }),
      400,
      "TXN_003",
    );
    expectError(
      await call("GET", "/api/accounts/transfer/99999", { token: accessToken }),
      404,
      "TXN_004",
    );
  });
});

describe("mock API · demo users", () => {
  it("has a user with an empty account for empty states", async () => {
    const { accessToken } = await login("demo.empty");
    const [account] = await accountsOf(accessToken);
    expect(account?.balance).toBe(0);
    const { body } = await call("GET", `/api/transactions/${account?.id}`, { token: accessToken });
    expect(body).toMatchObject({ totalElements: 0, empty: true });
  });
});
