"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { accountKeys } from "@/features/accounts/queries";
import { getAppSession } from "@/features/auth/session";
import { transactionKeys } from "@/features/transactions/queries";

import { createTransfersApi } from "./api";

import type { CheckedTransfer } from "./transfer-details";

/**
 * Sends a checked transfer. Afterwards the balances and the source account's
 * history are refetched (architecture.md, "Cache updates after mutations").
 */
export function useSendTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transfer: CheckedTransfer) =>
      createTransfersApi(getAppSession().client).send(transfer.request),
    onSuccess: (_response, transfer) => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({ queryKey: transactionKeys.list(transfer.from.id) });
    },
  });
}
