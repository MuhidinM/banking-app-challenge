import {
  CircleDollarSign,
  Hourglass,
  Landmark,
  type LucideIcon,
  Lock,
  Percent,
  Sunset,
} from "lucide-react";

import type { AccountType } from "@/shared/api/types";

interface AccountTypeInfo {
  label: string;
  /** One line for the "Open an account" choice (the first three are the spec's wording). */
  description: string;
  icon: LucideIcon;
}

/** What each account type is called and drawn with (design-notes, Icons; N-003). */
export const ACCOUNT_TYPES: Record<AccountType, AccountTypeInfo> = {
  CHECKING: { label: "Checking", description: "Everyday spending and transfers.", icon: Landmark },
  SAVINGS: {
    label: "Savings",
    description: "Set money aside and earn interest.",
    icon: CircleDollarSign,
  },
  MONEY_MARKET: {
    label: "Money market",
    description: "Higher interest, limited withdrawals.",
    icon: Percent,
  },
  INDIVIDUAL_RETIREMENT_ACCOUNT: {
    label: "Retirement",
    description: "Long-term savings for later in life.",
    icon: Sunset,
  },
  FIXED_TIME_DEPOSIT: {
    label: "Fixed-term deposit",
    description: "Money kept for a set term at a fixed rate.",
    icon: Hourglass,
  },
  SPECIAL_BLOCKED_ACCOUNT: {
    label: "Blocked account",
    description: "Money held aside for a specific purpose.",
    icon: Lock,
  },
};

/** The types the design offers first (Open an account); the rest sit behind "More account types". */
export const MAIN_ACCOUNT_TYPES: AccountType[] = ["SAVINGS", "CHECKING", "MONEY_MARKET"];
export const MORE_ACCOUNT_TYPES: AccountType[] = [
  "INDIVIDUAL_RETIREMENT_ACCOUNT",
  "FIXED_TIME_DEPOSIT",
  "SPECIAL_BLOCKED_ACCOUNT",
];
