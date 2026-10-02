"use client";

import { Eye, EyeOff, RotateCw } from "lucide-react";

import { totalBalance, useAccounts } from "@/features/accounts/queries";
import { formatMoney } from "@/shared/lib/money";
import { fitAmountStyle } from "@/shared/ui/fit-amount";
import { Skeleton } from "@/shared/ui/skeleton";

import { useHiddenBalance } from "./use-hidden-balance";

const accountsLabel = (count: number) => (count === 1 ? "1 account" : `${count} accounts`);

/**
 * The total across every account (UI spec: gradient card, radius 16, padding
 * 22/22/20, eye button to hide the amount). It sums all pages of accounts,
 * not only the first (R-FLOW-02).
 */
export function BalanceCard() {
  const { data: accounts, isPending, isError, refetch, isRefetching } = useAccounts();
  const { hidden, toggle } = useHiddenBalance();

  let amount;
  if (isPending) {
    amount = <Skeleton className="my-1.5 h-9 w-56 bg-on-primary/20" />;
  } else if (isError) {
    amount = <p className="type-heading">We couldn&apos;t load your balance.</p>;
  } else {
    const total = formatMoney(totalBalance(accounts));
    amount = (
      <p
        className="type-display amount-fit amount [--amount-size:2.25rem] md:[--amount-size:2.5rem]"
        style={fitAmountStyle(total)}
      >
        {hidden ? (
          <>
            <span aria-hidden="true">ETB ••••••</span>
            <span className="sr-only">Hidden</span>
          </>
        ) : (
          total
        )}
      </p>
    );
  }

  let footer = " ";
  if (isError) footer = "Check your connection and try again.";
  else if (accounts) footer = `Across ${accountsLabel(accounts.length)}`;

  return (
    <section
      aria-labelledby="total-balance-label"
      className="flex flex-col rounded-card bg-balance px-[1.375rem] pt-[1.375rem] pb-5 text-on-primary shadow-float"
    >
      <h2 id="total-balance-label" className="mb-[1.125rem] type-body-strong">
        Total balance
      </h2>
      <p className="mb-1 type-body opacity-80">Available balance</p>

      <div className="flex items-center justify-between gap-4">
        <div className="@container min-w-0 flex-1">{amount}</div>
        {isError ? (
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefetching}
            className="flex h-hit shrink-0 items-center gap-2 rounded-pill bg-on-primary/15 px-4 type-label hover:bg-on-primary/25"
          >
            <RotateCw aria-hidden="true" className="size-4" strokeWidth={2} />
            Try again
          </button>
        ) : (
          <button
            type="button"
            onClick={toggle}
            disabled={isPending}
            aria-pressed={hidden}
            aria-label="Hide balance"
            className="flex size-hit shrink-0 items-center justify-center rounded-pill"
          >
            <span className="flex size-9 items-center justify-center rounded-pill bg-on-primary/15 hover:bg-on-primary/25">
              {hidden ? (
                <EyeOff aria-hidden="true" className="size-icon" strokeWidth={1.75} />
              ) : (
                <Eye aria-hidden="true" className="size-icon" strokeWidth={1.75} />
              )}
            </span>
          </button>
        )}
      </div>

      <p className="type-body opacity-80">{footer}</p>
    </section>
  );
}
