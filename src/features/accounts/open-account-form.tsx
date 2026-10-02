"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { describeError } from "@/shared/api/error-messages";
import type { AccountType } from "@/shared/api/types";
import { formatAccountNumber } from "@/shared/lib/account-number";
import { ZERO, formatMoney, parseAmountInput } from "@/shared/lib/money";
import { AmountField } from "@/shared/ui/amount-field";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { InlineMessage } from "@/shared/ui/feedback";
import { RadioCards } from "@/shared/ui/radio-cards";
import { toast } from "@/shared/ui/toast";

import { ACCOUNT_TYPES, MAIN_ACCOUNT_TYPES, MORE_ACCOUNT_TYPES } from "./account-types";
import { useOpenAccount } from "./queries";

const option = (type: AccountType) => ({ value: type, ...ACCOUNT_TYPES[type] });
const isAccountType = (value: string): value is AccountType => value in ACCOUNT_TYPES;

/**
 * Open an account (UI spec, WebNewAccount and mobile NewAccount): a type, an
 * optional first deposit, then the new account's page. The design shows three
 * types; "More account types" reveals the API's other three (N-003).
 */
export function OpenAccountForm() {
  const router = useRouter();
  const openAccount = useOpenAccount();

  const [accountType, setAccountType] = useState<AccountType>("SAVINGS");
  const [showMore, setShowMore] = useState(false);
  const [deposit, setDeposit] = useState("");
  const [depositError, setDepositError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);

  // A choice from the extra types stays visible even if the list is folded away.
  const visibleTypes =
    showMore || MORE_ACCOUNT_TYPES.includes(accountType)
      ? [...MAIN_ACCOUNT_TYPES, ...MORE_ACCOUNT_TYPES]
      : MAIN_ACCOUNT_TYPES;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (openAccount.isPending) return;

    // Empty means start at 0 (the API requires a value).
    const initialDeposit = deposit.trim() === "" ? ZERO : parseAmountInput(deposit);
    if (initialDeposit === null) {
      setDepositError("Enter an amount like 250.00, or leave it empty.");
      return;
    }
    setDepositError(undefined);
    setFormError(null);

    openAccount.mutate(
      { accountType, initialDeposit },
      {
        onSuccess: (account) => {
          toast({
            title: `${ACCOUNT_TYPES[account.accountType].label} account opened.`,
            description: `Account ${formatAccountNumber(account.accountNumber)}, balance ${formatMoney(initialDeposit)}.`,
          });
          router.push(`/accounts/${account.id}`);
        },
        onError: (error) => {
          const { message, field } = describeError(error, "openAccount");
          if (field === "initialBalance") setDepositError(message);
          else setFormError(message);
        },
      },
    );
  }

  return (
    // Phones draw the fields straight on the page (mobile NewAccount); web puts them in a card.
    <Card className="max-md:border-0 max-md:bg-transparent max-md:shadow-none md:max-w-[36rem] md:p-6">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 max-md:gap-[1.375rem]"
      >
        {formError ? (
          <InlineMessage tone="error" announce="assertive">
            {formError}
          </InlineMessage>
        ) : null}

        <div className="flex flex-col gap-2.5">
          <RadioCards
            label="Account type"
            name="accountType"
            options={visibleTypes.map(option)}
            value={accountType}
            onValueChange={(value) => isAccountType(value) && setAccountType(value)}
            disabled={openAccount.isPending}
          />
          {visibleTypes.length === MAIN_ACCOUNT_TYPES.length ? (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="hit-area flex items-center gap-1.5 self-start rounded-control py-1 type-label text-primary underline-offset-4 hover:underline"
            >
              More account types
              <ChevronDown aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
          ) : null}
        </div>

        <AmountField
          label="Initial deposit (optional)"
          name="initialDeposit"
          value={deposit}
          onChange={(value) => {
            setDeposit(value);
            if (depositError) setDepositError(undefined);
          }}
          hint="Leave empty to start at ETB 0.00."
          error={depositError}
          disabled={openAccount.isPending}
        />

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <Button asChild variant="ghost" className="max-md:hidden">
            <Link href="/accounts">Cancel</Link>
          </Button>
          <Button type="submit" loading={openAccount.isPending} className="max-md:w-full">
            Open account
          </Button>
        </div>
      </form>
    </Card>
  );
}
