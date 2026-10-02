import { transactionKeys } from "@/features/transactions/queries";
import type { Account } from "@/shared/api/types";

import { accountKeys } from "./queries";

import type { QueryClient } from "@tanstack/react-query";

/**
 * After money moves (a transfer or a bill payment), refetch what it changed
 * (architecture.md, "Cache updates after mutations"; R-FLOW-18):
 * - every account's balance
 * - the source account's history
 * - for a transfer to another of the user's own accounts, that account's
 *   history too, since it now has a money-in row
 *
 * Screens showing them update without a reload; the others refetch when
 * they are next opened.
 */
export function refreshAfterMoneyMoves(
  queryClient: QueryClient,
  {
    fromAccountId,
    toAccountNumber,
  }: {
    fromAccountId: number;
    /** A transfer's recipient; omitted for a bill payment. */
    toAccountNumber?: string | undefined;
  },
): Promise<unknown> {
  const accounts = queryClient.getQueryData<Account[]>(accountKeys.list());
  const ownRecipient = toAccountNumber
    ? accounts?.find((account) => account.accountNumber === toAccountNumber)
    : undefined;

  return Promise.all([
    queryClient.invalidateQueries({ queryKey: accountKeys.all }),
    queryClient.invalidateQueries({ queryKey: transactionKeys.list(fromAccountId) }),
    ...(ownRecipient
      ? [queryClient.invalidateQueries({ queryKey: transactionKeys.list(ownRecipient.id) })]
      : []),
  ]);
}
