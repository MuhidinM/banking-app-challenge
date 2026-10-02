"use client";

import { flattenHistory, useTransactionHistory } from "@/features/transactions/queries";
import type { Transaction } from "@/shared/api/types";
import { formatAccountNumber } from "@/shared/lib/account-number";

const LIMIT = 3;

/**
 * The accounts most recently sent money to, newest first and each once:
 * outgoing transfers in the history, which is where the API keeps them (it
 * has no saved payees).
 */
export function recentRecipients(transactions: readonly Transaction[], limit = LIMIT): string[] {
  const recipients: string[] = [];
  for (const transaction of transactions) {
    const recipient = transaction.relatedAccount;
    if (
      transaction.type === "FUND_TRANSFER" &&
      transaction.direction === "DEBIT" &&
      recipient &&
      !recipients.includes(recipient)
    ) {
      recipients.push(recipient);
      if (recipients.length === limit) break;
    }
  }
  return recipients;
}

/**
 * "Recent" chips under the recipient field: one tap fills in an account this
 * account sent money to lately. Read from the first page of its history,
 * usually cached already by the dashboard; nothing shows while it loads or if
 * it fails, since typing the number still works.
 */
export function RecentRecipients({
  fromAccountId,
  onPick,
}: {
  fromAccountId: number;
  onPick: (accountNumber: string) => void;
}) {
  const history = useTransactionHistory(fromAccountId);
  const firstPage = history.data ? flattenHistory(history.data.pages.slice(0, 1)) : null;
  const recipients = firstPage ? recentRecipients(firstPage.transactions) : [];
  if (recipients.length === 0) return null;

  return (
    <div
      role="group"
      aria-labelledby="recent-recipients"
      className="-mt-2 flex flex-wrap items-center gap-2"
    >
      <span id="recent-recipients" className="type-caption text-ink-muted">
        Recent
      </span>
      {recipients.map((recipient) => (
        <button
          key={recipient}
          type="button"
          onClick={() => onPick(recipient)}
          className="h-control-compact rounded-pill border border-border bg-surface px-4 type-body amount text-ink hover:bg-surface-muted"
        >
          {formatAccountNumber(recipient)}
        </button>
      ))}
    </div>
  );
}
