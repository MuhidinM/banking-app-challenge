"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { accountKeys } from "@/features/accounts/queries";
import { getAppSession } from "@/features/auth/session";
import { transactionKeys } from "@/features/transactions/queries";

import { createBillsApi } from "./api";

import type { CheckedBill } from "./bill-details";

/**
 * Pays a checked bill. Afterwards the balances and the paying account's
 * history are refetched (architecture.md, "Cache updates after mutations").
 */
export function usePayBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bill: CheckedBill) => createBillsApi(getAppSession().client).pay(bill.request),
    onSuccess: (_response, bill) => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.list(bill.from.id) });
    },
  });
}
