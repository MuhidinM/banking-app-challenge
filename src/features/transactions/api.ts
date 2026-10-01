import { z } from "zod";

import type { HttpClient } from "@/shared/api/http-client";
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

const pageSchema = z.object({
  content: z.array(transactionSchema),
  totalElements: z.number(),
  totalPages: z.number(),
  size: z.number(),
  number: z.number(),
  numberOfElements: z.number(),
  first: z.boolean(),
  last: z.boolean(),
  empty: z.boolean(),
}) satisfies z.ZodType<Page<Transaction>>;

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
      return pageSchema.parse(response);
    },
  };
}
