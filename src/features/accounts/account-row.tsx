import type { Account } from "@/shared/api/types";
import { maskAccountNumber } from "@/shared/lib/account-number";
import { formatMoney, toCents } from "@/shared/lib/money";
import { ListRow } from "@/shared/ui/list-row";

import { ACCOUNT_TYPES } from "./account-types";

/**
 * One account in a list (UI spec, "Rows"): type icon on a primary disc, type,
 * •••• last four, balance with "Available", linking to the account.
 */
export function AccountRow({ account }: { account: Account }) {
  const type = ACCOUNT_TYPES[account.accountType];
  return (
    <ListRow
      icon={type.icon}
      tone="primary"
      title={type.label}
      meta={maskAccountNumber(account.accountNumber)}
      value={formatMoney(toCents(account.balance))}
      valueMeta="Available"
      href={`/accounts/${account.id}`}
    />
  );
}
