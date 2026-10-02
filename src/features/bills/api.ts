import { z } from "zod";

import type { HttpClient } from "@/shared/api/http-client";
import type { BillPaymentRequest, BillPaymentResponse } from "@/shared/api/types";

const billPaymentResponseSchema = z.object({
  message: z.string(),
  amount: z.number(),
  accountNumber: z.string(),
  biller: z.string(),
}) satisfies z.ZodType<BillPaymentResponse>;

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
  };
}
