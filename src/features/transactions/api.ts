import { z } from "zod";

import type { HttpClient } from "@/shared/api/http-client";
import { pageSchema } from "@/shared/api/page-schema";
import {
  type Page,
  type Transaction,
  transactionDirections,
  transactionTypes,
} from "@/shared/api/types";

/** Rows per request. The API's default; the design shows "Showing 3 of 6" after one page. */
export const HISTORY_PAGE_SIZE = 10;

// Money rows: a malformed amount or direction must fail here, not show a wrong
// sign or balance further down.
const transactionSchema = z.object({
  id: z.number(),
  amount: z.number(),
  type: z.enum(transactionTypes),
  direction: z.enum(transactionDirections),
  timestamp: z.string(),
  description: z.string().nullish(),
  relatedAccount: z.string().nullish(),
  accountId: z.number(),
  balanceAfter: z.number().nullish(),
}) satisfies z.ZodType<Transaction>;

const historyPageSchema = pageSchema(transactionSchema);

/** Rows per request while looking for one transaction, and how many pages to try. */
const FIND_PAGE_SIZE = 50;
const FIND_MAX_PAGES = 20;

export interface HistoryPageRequest {
  /** 0-based page number. */
  page: number;
  size?: number;
  signal?: AbortSignal | undefined;
}

export function createTransactionsApi(client: HttpClient) {
  return {
    /**
     * GET /api/transactions/{accountId}: one page of an account's history,
     * newest first. `accountId` is the internal id, not the account number.
     */
    async listPage(
      accountId: number,
      { page, size = HISTORY_PAGE_SIZE, signal }: HistoryPageRequest,
    ): Promise<Page<Transaction>> {
      const response = await client.request<unknown>(`/api/transactions/${accountId}`, {
        query: { page, size, sort: "timestamp,DESC" },
        signal,
      });
      return historyPageSchema.parse(response);
    },

    /**
     * One transaction of the account, or null when it isn't there. The API
     * has no "get transaction by id" for every type (only transfers and bill
     * payments), so this reads the history, newest first, until it finds it.
     * Used when `?tx=` is opened from a link or a reload, before the list
     * has loaded that row.
     */
    async find(
      accountId: number,
      transactionId: number,
      signal?: AbortSignal,
    ): Promise<Transaction | null> {
      for (let page = 0; page < FIND_MAX_PAGES; page++) {
        const result = await this.listPage(accountId, { page, size: FIND_PAGE_SIZE, signal });
        const match = result.content.find((row) => row.id === transactionId);
        if (match) return match;
        if (result.last) return null;
      }
      return null;
    },
  };
}
