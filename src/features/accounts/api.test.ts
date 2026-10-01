import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { toCents } from "@/shared/lib/money";
import { addAccounts } from "@/test/add-accounts";

import { createAccountsApi } from "./api";
import { totalBalance } from "./queries";

const api = () => createAccountsApi(getAppSession().client);

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("accounts API", () => {
  it("lists the user's accounts, oldest first", async () => {
    const accounts = await api().listAll();
    expect(accounts.map((account) => [account.accountType, account.accountNumber])).toEqual([
      ["CHECKING", "8751138057"],
      ["SAVINGS", "4410298911"],
    ]);
  });

  it("loads every page, however many accounts there are", async () => {
    // 2 seed accounts + 118 = 120: three pages of 50.
    addAccounts(
      "demo.jane",
      Array.from({ length: 118 }, () => 1),
    );
    const pages: number[] = [];
    server.events.on("request:start", ({ request }) => {
      const url = new URL(request.url);
      if (url.pathname === "/api/accounts") pages.push(Number(url.searchParams.get("page")));
    });

    const accounts = await api().listAll();

    expect(accounts).toHaveLength(120);
    expect(new Set(accounts.map((account) => account.id)).size).toBe(120);
    expect(pages.sort()).toEqual([0, 1, 2]);
    server.events.removeAllListeners();
  });

  it("refuses a malformed account", async () => {
    server.use(
      http.get(apiUrl("/api/accounts"), () =>
        HttpResponse.json({
          content: [{ id: 1, accountNumber: "8751138057", balance: "lots" }],
          totalElements: 1,
          totalPages: 1,
          size: 50,
          number: 0,
          numberOfElements: 1,
          first: true,
          last: true,
          empty: false,
        }),
      ),
    );
    await expect(api().listAll()).rejects.toThrow();
  });
});

describe("totalBalance", () => {
  it("adds in cents, so decimals never drift", () => {
    const accounts = [0.1, 0.2, 1_000_000.05].map((balance, id) => ({
      id,
      accountNumber: String(id),
      balance,
      userId: 1,
      accountType: "SAVINGS" as const,
    }));
    expect(totalBalance(accounts)).toBe(toCents(1_000_000.35));
  });

  it("is zero without accounts", () => {
    expect(totalBalance([])).toBe(0);
  });
});
