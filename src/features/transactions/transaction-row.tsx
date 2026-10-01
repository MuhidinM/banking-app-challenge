import type { Transaction } from "@/shared/api/types";
import { ListRow } from "@/shared/ui/list-row";

import {
  isCredit,
  signedAmount,
  transactionMeta,
  transactionSentence,
  transactionTitle,
  transactionTypeInfo,
} from "./transaction-format";

import type { MouseEvent } from "react";

/**
 * One transaction (UI spec, component sheet "Rows"): type icon, title,
 * "Type · time" and the signed amount. Money in has a green disc and amount,
 * but the sign carries the direction too, and screen readers hear it in words.
 * With `onSelect` the whole row is a button that opens the details.
 */
export function TransactionRow({
  transaction,
  onSelect,
}: {
  transaction: Transaction;
  /** Opens the details; the row is then a button. */
  onSelect?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const credit = isCredit(transaction);
  return (
    <ListRow
      icon={transactionTypeInfo[transaction.type].icon}
      tone={credit ? "credit" : "neutral"}
      title={transactionTitle(transaction)}
      meta={transactionMeta(transaction)}
      value={signedAmount(transaction)}
      {...(credit ? { valueClassName: "text-credit" } : {})}
      label={transactionSentence(transaction)}
      {...(onSelect ? { onClick: onSelect } : {})}
    />
  );
}
