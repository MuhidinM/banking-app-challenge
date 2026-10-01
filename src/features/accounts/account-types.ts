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

/** What each account type is called and drawn with (design-notes, Icons; N-003). */
export const ACCOUNT_TYPES: Record<AccountType, { label: string; icon: LucideIcon }> = {
  CHECKING: { label: "Checking", icon: Landmark },
  SAVINGS: { label: "Savings", icon: CircleDollarSign },
  MONEY_MARKET: { label: "Money market", icon: Percent },
  INDIVIDUAL_RETIREMENT_ACCOUNT: { label: "Retirement", icon: Sunset },
  FIXED_TIME_DEPOSIT: { label: "Fixed-term deposit", icon: Hourglass },
  SPECIAL_BLOCKED_ACCOUNT: { label: "Blocked account", icon: Lock },
};
