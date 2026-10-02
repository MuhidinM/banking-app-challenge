"use client";

import type { Account } from "@/shared/api/types";
import { maskAccountNumber } from "@/shared/lib/account-number";
import { formatMoney, toCents } from "@/shared/lib/money";
import { SelectField, type SelectOption } from "@/shared/ui/select-field";

import { ACCOUNT_TYPES } from "./account-types";

/** "Checking · •••• 8057" (UI spec, Transfer: the From field). */
export const accountChoiceLabel = (account: Account) =>
  `${ACCOUNT_TYPES[account.accountType].label} · ${maskAccountNumber(account.accountNumber)}`;

function option(account: Account): SelectOption {
  return {
    value: String(account.id),
    label: accountChoiceLabel(account),
    description: `Available ${formatMoney(toCents(account.balance))}`,
    icon: ACCOUNT_TYPES[account.accountType].icon,
  };
}

interface AccountSelectProps {
  label: string;
  accounts: readonly Account[];
  /** The chosen account's id, or undefined for none. */
  value: number | undefined;
  onValueChange: (accountId: number) => void;
  error?: string | undefined;
  disabled?: boolean;
  className?: string;
}

/**
 * Pick one of the user's own accounts, each with its type, last four digits
 * and available balance (UI spec, Transfer and Pay bill: "From"). Used by the
 * transfer and bill payment forms.
 */
export function AccountSelect({
  label,
  accounts,
  value,
  onValueChange,
  error,
  disabled,
  className,
}: AccountSelectProps) {
  return (
    <SelectField
      label={label}
      options={accounts.map(option)}
      value={value === undefined ? undefined : String(value)}
      onValueChange={(id) => onValueChange(Number(id))}
      placeholder="Choose an account"
      error={error}
      disabled={disabled}
      className={className}
    />
  );
}
