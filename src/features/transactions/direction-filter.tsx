"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import type { TransactionDirection } from "@/shared/api/types";
import { type FilterOption, FilterPills } from "@/shared/ui/filter-pills";

/** "all", or one direction as the API names it (`?direction=CREDIT`). */
export type DirectionFilterValue = "all" | TransactionDirection;

const OPTIONS: FilterOption<DirectionFilterValue>[] = [
  { value: "all", label: "All" },
  { value: "CREDIT", label: "Money in", icon: ArrowDownLeft, iconClassName: "text-credit" },
  { value: "DEBIT", label: "Money out", icon: ArrowUpRight, iconClassName: "text-debit" },
];

/** The filter in `?direction=`; anything other than CREDIT or DEBIT means all. */
export function readDirectionParam(value: string | null): DirectionFilterValue {
  return value === "CREDIT" || value === "DEBIT" ? value : "all";
}

/** All / Money in / Money out (UI spec, Transactions and WebAccountDetail). */
export function DirectionFilter({
  value,
  onValueChange,
  className,
}: {
  value: DirectionFilterValue;
  onValueChange: (value: DirectionFilterValue) => void;
  className?: string;
}) {
  return (
    <FilterPills
      label="Show"
      options={OPTIONS}
      value={value}
      onValueChange={onValueChange}
      {...(className ? { className } : {})}
    />
  );
}
