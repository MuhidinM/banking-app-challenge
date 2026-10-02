import { z } from "zod";

import type { HttpClient } from "@/shared/api/http-client";
import type { TransferRequest, TransferResponse } from "@/shared/api/types";

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
  };
}
