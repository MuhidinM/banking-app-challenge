import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import type { Transaction } from "@/shared/api/types";
import { parseApiDate, formatTime } from "@/shared/lib/dates";
import { formatMoney, toCents } from "@/shared/lib/money";
import { ListRow } from "@/shared/ui/list-row";

/** One transaction in a history list: description, time and signed amount. */
export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const credit = transaction.direction === "CREDIT";
  return (
    <ListRow
      icon={credit ? ArrowDownLeft : ArrowUpRight}
      tone={credit ? "credit" : "neutral"}
      title={transaction.description ?? "Transaction"}
      meta={formatTime(parseApiDate(transaction.timestamp))}
      value={formatMoney(toCents(transaction.amount), { sign: credit ? "credit" : "debit" })}
      valueClassName={credit ? "text-credit" : undefined}
    />
  );
}
