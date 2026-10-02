import { z } from "zod";

import { transactionSchema } from "@/features/transactions/api";
import type { HttpClient } from "@/shared/api/http-client";
import type { Transaction, TransferRequest, TransferResponse } from "@/shared/api/types";

const transferResponseSchema = z.object({
  message: z.string(),
  amount: z.number(),
  fromAccountNumber: z.string(),
  toAccountNumber: z.string(),
}) satisfies z.ZodType<TransferResponse>;

export function createTransfersApi(client: HttpClient) {
  return {
    /**
     * POST /api/accounts/transfer. Money moves, so it is never retried: the
     * HTTP client retries only after a token refresh, and the query client
     * never retries mutations (src/shared/api/query-client.ts).
     */
    async send(request: TransferRequest): Promise<TransferResponse> {
      const response = await client.request<unknown>("/api/accounts/transfer", {
        method: "POST",
        body: request,
      });
      return transferResponseSchema.parse(response);
    },

    /**
     * GET /api/accounts/transfer/{id}: one of the user's transfers, for the
     * receipt. The API answers 404 TXN_004 when there is no such transaction
     * and 400 TXN_003 when it isn't a transfer.
     */
    async getReceipt(transactionId: number, signal?: AbortSignal): Promise<Transaction> {
      const response = await client.request<unknown>(`/api/accounts/transfer/${transactionId}`, {
        signal,
      });
      return transactionSchema.parse(response);
    },
  };
}
