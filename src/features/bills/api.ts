import * as z from "zod/mini";

import { transactionSchema } from "@/features/transactions/api";
import type { HttpClient } from "@/shared/api/http-client";
import type { BillPaymentRequest, BillPaymentResponse, Transaction } from "@/shared/api/types";

const billPaymentResponseSchema = z.object({
  message: z.string(),
  amount: z.number(),
  accountNumber: z.string(),
  biller: z.string(),
}) satisfies z.ZodMiniType<BillPaymentResponse>;

export function createBillsApi(client: HttpClient) {
  return {
    /**
     * POST /api/accounts/pay-bill. Money moves, so it is never retried (the
     * query client never retries mutations).
     */
    async pay(request: BillPaymentRequest): Promise<BillPaymentResponse> {
      const response = await client.request<unknown>("/api/accounts/pay-bill", {
        method: "POST",
        body: request,
      });
      return billPaymentResponseSchema.parse(response);
    },

    /**
     * GET /api/accounts/pay-bill/{id}: one of the user's bill payments, for
     * the receipt. The API answers 404 TXN_004 when there is no such
     * transaction and 400 TXN_003 when it isn't a bill payment.
     */
    async getReceipt(transactionId: number, signal?: AbortSignal): Promise<Transaction> {
      const response = await client.request<unknown>(`/api/accounts/pay-bill/${transactionId}`, {
        signal,
      });
      return transactionSchema.parse(response);
    },
  };
}
