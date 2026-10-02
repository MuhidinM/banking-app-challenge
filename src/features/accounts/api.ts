import * as z from "zod/mini";

import type { HttpClient } from "@/shared/api/http-client";
import { pageSchema } from "@/shared/api/page-schema";
import {
  type Account,
  type CreateAccountRequest,
  type Page,
  accountTypes,
} from "@/shared/api/types";
import { type Cents, fromCents } from "@/shared/lib/money";

// Balances drive every total on screen, so a malformed account fails here.
const accountSchema = z.object({
  id: z.number(),
  accountNumber: z.string(),
  balance: z.number(),
  userId: z.number(),
  accountType: z.enum(accountTypes),
}) satisfies z.ZodMiniType<Account>;

const accountPageSchema = pageSchema(accountSchema);

/**
 * Accounts per request when loading all of them. The API's default is 10; a
 * larger page means one request for almost every user, and the loop below
 * still handles more.
 */
export const ACCOUNTS_PAGE_SIZE = 50;

export function createAccountsApi(client: HttpClient) {
  async function listPage(page: number, signal?: AbortSignal): Promise<Page<Account>> {
    const response = await client.request<unknown>("/api/accounts", {
      query: { page, size: ACCOUNTS_PAGE_SIZE, sort: "id,ASC" },
      signal,
    });
    return accountPageSchema.parse(response);
  }

  return {
    /**
     * Every account of the signed-in user, across all pages (GET /api/accounts
     * is paged). The total balance must include them all (R-FLOW-02), so this
     * keeps going until the API says the last page was reached.
     */
    async listAll({ signal }: { signal?: AbortSignal } = {}): Promise<Account[]> {
      const first = await listPage(0, signal);
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
          listPage(index + 1, signal),
        ),
      );
      return [first, ...rest].flatMap((page) => page.content);
    },

    /**
     * POST /api/accounts. The schema requires `initialBalance` (the docs say
     * it defaults to 0), so it is always sent (docs/api-notes.md).
     */
    async open(accountType: Account["accountType"], initialDeposit: Cents): Promise<Account> {
      const body: CreateAccountRequest = { accountType, initialBalance: fromCents(initialDeposit) };
      const response = await client.request<unknown>("/api/accounts", { method: "POST", body });
      return accountSchema.parse(response);
    },
  };
}
