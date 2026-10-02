"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { refreshAfterMoneyMoves } from "@/features/accounts/refresh-after-money-moves";
import { getAppSession } from "@/features/auth/session";

import { createBillsApi } from "./api";

import type { CheckedBill } from "./bill-details";

/**
 * Pays a checked bill. Afterwards every balance and the paying account's
 * history are refetched (R-FLOW-18), through the helper transfers use too.
 */
export function usePayBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bill: CheckedBill) => createBillsApi(getAppSession().client).pay(bill.request),
    onSuccess: (_response, bill) =>
      void refreshAfterMoneyMoves(queryClient, { fromAccountId: bill.from.id }),
  });
}
