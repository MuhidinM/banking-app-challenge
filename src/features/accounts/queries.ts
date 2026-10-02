"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAppSession } from "@/features/auth/session";
import type { Account } from "@/shared/api/types";
import type { AccountType } from "@/shared/api/types";
import { type Cents, ZERO, addCents, toCents } from "@/shared/lib/money";

import { createAccountsApi } from "./api";

/**
 * Query keys for accounts (ADR-0004). Opening an account, a transfer and a
 * bill payment invalidate `accountKeys.all` (architecture.md).
 */
export const accountKeys = {
  all: ["accounts"] as const,
  list: () => [...accountKeys.all, "list"] as const,
};

/** All of the signed-in user's accounts, oldest first (dashboard, accounts page, pickers). */
export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: ({ signal }) => createAccountsApi(getAppSession().client).listAll({ signal }),
  });
}

/** The sum of every balance, in cents so it never drifts (ADR-0007). */
export function totalBalance(accounts: readonly Account[]): Cents {
  return accounts.reduce((sum, account) => addCents(sum, toCents(account.balance)), ZERO);
}

/**
 * Opens an account. The new account goes into the cached list at once, so the
 * list and the total show it without a reload, then the list is refetched to
 * match the server.
 */
export function useOpenAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountType,
      initialDeposit,
    }: {
      accountType: AccountType;
      initialDeposit: Cents;
    }) => createAccountsApi(getAppSession().client).open(accountType, initialDeposit),
    onSuccess: (account) => {
      queryClient.setQueryData<Account[]>(accountKeys.list(), (accounts) =>
        accounts ? [...accounts, account] : accounts,
      );
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
