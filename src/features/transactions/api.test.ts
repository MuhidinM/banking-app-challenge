import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { getAppSession } from "@/features/auth/session";
import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { isApiError } from "@/shared/api/api-error";

import { createTransactionsApi } from "./api";

// Seed (src/mocks/fixtures.ts): account 1 is Jane's checking with 13 rows;
// account 3 is John's.
const JANE_CHECKING = 1;
const JOHN_CHECKING = 3;

const api = () => createTransactionsApi(getAppSession().client);

beforeEach(async () => {
  await getAppSession().signIn({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
});

describe("transactions API", () => {
  it("loads the first page, newest first", async () => {
    const page = await api().listPage(JANE_CHECKING, { page: 0 });

    expect(page).toMatchObject({ number: 0, size: 10, totalElements: 13, last: false });
    expect(page.content).toHaveLength(10);
    const times = page.content.map((row) => row.timestamp);
    expect(times).toEqual([...times].sort().reverse());
  });

  it("loads the next page", async () => {
    const page = await api().listPage(JANE_CHECKING, { page: 1 });

    expect(page).toMatchObject({ number: 1, numberOfElements: 3, last: true });
  });

  it("rejects another customer's account", async () => {
    const error: unknown = await api()
      .listPage(JOHN_CHECKING, { page: 0 })
      .catch((caught: unknown) => caught);

    expect(isApiError(error) && error.code).toBe("ACC_004");
  });

  it("refuses a row with an unknown direction", async () => {
    server.use(
      http.get(apiUrl("/api/transactions/:accountId"), () =>
        HttpResponse.json({
          content: [
            {
              id: 1,
              amount: 10,
              type: "REFUND",
              direction: "SIDEWAYS",
              timestamp: "2026-09-30T10:00:00",
              accountId: 1,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 10,
          number: 0,
          numberOfElements: 1,
          first: true,
          last: true,
          empty: false,
        }),
      ),
    );

    await expect(api().listPage(JANE_CHECKING, { page: 0 })).rejects.toThrow();
  });
});
