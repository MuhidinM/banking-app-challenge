"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { refreshAfterMoneyMoves } from "@/features/accounts/refresh-after-money-moves";
import { getAppSession } from "@/features/auth/session";

import { createTransfersApi } from "./api";

import type { CheckedTransfer } from "./transfer-details";

/**
 * Sends a checked transfer. Afterwards the balances, the source account's
 * history, and the recipient's when it is one of the user's own accounts, are
 * refetched (refreshAfterMoneyMoves, R-FLOW-18).
 */
export function useSendTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transfer: CheckedTransfer) =>
      createTransfersApi(getAppSession().client).send(transfer.request),
    onSuccess: (_response, transfer) => {
      void refreshAfterMoneyMoves(queryClient, {
        fromAccountId: transfer.from.id,
        toAccountNumber: transfer.toAccountNumber,
      });
    },
  });
}
