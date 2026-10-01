"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { getAppSession } from "@/features/auth/session";
import type { Page, Transaction } from "@/shared/api/types";

import { createTransactionsApi } from "./api";

/**
 * Query keys for transactions (ADR-0004: one key factory per feature).
 * Invalidating `list(accountId)` after a transfer or bill payment refetches
 * that account's history (architecture.md, "Cache updates after mutations").
 */
export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (accountId: number) => [...transactionKeys.lists(), accountId] as const,
};

/** An account's history, newest first, one page at a time ("Load more"). */
export function useTransactionHistory(accountId: number) {
  return useInfiniteQuery({
    queryKey: transactionKeys.list(accountId),
    queryFn: ({ pageParam, signal }) =>
      createTransactionsApi(getAppSession().client).listPage(accountId, {
        page: pageParam,
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
  });
}

export interface LoadedHistory {
  transactions: Transaction[];
  /** The account's total, from the most recent page ("Showing x of y"). */
  total: number;
}

/**
 * The loaded pages as one list. Pages are fetched by offset, so a transaction
 * that arrives between two "Load more" clicks pushes the last row of one page
 * onto the next; it is kept once, where it first appeared.
 */
export function flattenHistory(pages: readonly Page<Transaction>[]): LoadedHistory {
  const seen = new Set<number>();
  const transactions: Transaction[] = [];
  for (const page of pages) {
    for (const transaction of page.content) {
      if (seen.has(transaction.id)) continue;
      seen.add(transaction.id);
      transactions.push(transaction);
    }
  }
  return { transactions, total: pages.at(-1)?.totalElements ?? 0 };
}
