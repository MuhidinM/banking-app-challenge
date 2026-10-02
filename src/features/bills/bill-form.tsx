"use client";

import { Building2, PencilLine } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";

import { AccountSelect, accountChoiceLabel } from "@/features/accounts/account-select";
import { describeError } from "@/shared/api/error-messages";
import type { Account } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";
import {
  type Cents,
  ZERO,
  addCents,
  formatAmountInput,
  formatMoney,
  parseAmountInput,
  toCents,
} from "@/shared/lib/money";
import { AmountField } from "@/shared/ui/amount-field";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { InlineMessage } from "@/shared/ui/feedback";
import { SelectField, type SelectOption } from "@/shared/ui/select-field";
import { TextField } from "@/shared/ui/text-field";

import {
  BILLERS,
  BILLER_MAX_LENGTH,
  type BillErrors,
  type BillField,
  type BillInput,
  type CheckedBill,
  OTHER_BILLER,
  amountError,
  billerName,
  checkBill,
} from "./bill-details";
import { usePayBill } from "./queries";

const CHIPS: { label: string; cents: Cents }[] = [
  { label: "+50", cents: toCents(50) },
  { label: "+100", cents: toCents(100) },
  { label: "+500", cents: toCents(500) },
];

const BILLER_OPTIONS: SelectOption[] = [
  ...BILLERS.map((name) => ({ value: name, label: name, icon: Building2 })),
  { value: OTHER_BILLER, label: "Other", icon: PencilLine },
];

/** Why Pay is disabled, in a few words, for the first problem in the form. */
const REASONS: Record<BillField, string> = {
  fromAccountId: "Choose an account to continue.",
  biller: "Choose a biller to continue.",
  otherBiller: "Enter the biller's name to continue.",
  amount: "Enter an amount to continue.",
};

/** Summary (UI spec, WebPayBill): the payment as entered, fee and total. */
function Summary({
  from,
  biller,
  amount,
  amountInvalid,
}: {
  from: Account | undefined;
  biller: string;
  amount: Cents | null;
  amountInvalid: boolean;
}) {
  const rows: [string, string, string?][] = [
    ["Pay from", from ? accountChoiceLabel(from).replace(" · ", " ") : "—"],
    ["Biller", biller || "—"],
    ["Amount", amount === null ? "—" : formatMoney(amount), amountInvalid ? "text-debit" : ""],
    // The API charges no fee (N-012).
    ["Fee", formatMoney(ZERO)],
  ];
  return (
    <>
      <h2 className="type-heading text-ink">Summary</h2>
      <dl className="flex flex-col gap-3.5">
        {rows.map(([term, value, tone]) => (
          <div key={term} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 type-body text-ink-muted">{term}</dt>
            <dd className={cn("truncate type-body amount text-ink", tone)}>{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="type-body-strong text-ink">Total</dt>
          <dd className="type-heading amount text-ink">{formatMoney(amount ?? ZERO)}</dd>
        </div>
      </dl>
    </>
  );
}

interface BillFormProps {
  accounts: readonly Account[];
  /** From `?from=<id>` (the account page's Pay bill shortcut), if it is one of the user's. */
  initialFromId?: number | undefined;
  /** Called once the API has taken the payment. */
  onPaid: (bill: CheckedBill) => void;
}

/**
 * Pay a bill (UI spec, WebPayBill and mobile PayBill): pay from, biller,
 * amount with quick chips. Pay stays disabled until the payment is valid,
 * with the reason beside it; "Insufficient funds" shows as soon as the
 * amount is too high. There is no review step in the design: Pay sends.
 */
export function BillForm({ accounts, initialFromId, onPaid }: BillFormProps) {
  const [input, setInput] = useState<BillInput>(() => ({
    fromAccountId: accounts.find((account) => account.id === initialFromId)?.id ?? accounts[0]?.id,
    biller: "",
    otherBiller: "",
    amount: "",
  }));
  // From the API, after Pay: on a field, or above the form.
  const [apiErrors, setApiErrors] = useState<BillErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pay = usePayBill();
  // A ref, not state: two clicks in the same tick both see the old state.
  const inFlight = useRef(false);
  const reasonId = useId();

  const from = accounts.find((account) => account.id === input.fromAccountId);
  const amountCents = parseAmountInput(input.amount);
  const liveAmountError = amountError(input.amount, from);
  const result = checkBill(input, accounts);
  const firstProblem = result.ok
    ? undefined
    : (["fromAccountId", "biller", "otherBiller", "amount"] as const).find(
        (field) => result.errors[field],
      );

  function update(changes: Partial<BillInput>) {
    setInput((current) => ({ ...current, ...changes }));
    setApiErrors({});
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result.ok || inFlight.current) return;
    inFlight.current = true;
    const bill = result.bill;
    pay.mutate(bill, {
      onSuccess: () => onPaid(bill),
      onError: (failure) => {
        inFlight.current = false;
        const { message, field } = describeError(failure, "bill", {
          availableCents: toCents(bill.from.balance),
        });
        if (field === "amount") setApiErrors({ amount: message });
        else if (field === "accountNumber") setApiErrors({ fromAccountId: message });
        else setFormError(message);
      },
    });
  }

  const sending = pay.isPending;
  const submitLabel =
    amountCents !== null && amountCents > 0 ? `Pay ${formatMoney(amountCents)}` : "Pay bill";
  const reason = firstProblem
    ? liveAmountError
      ? "Fix the amount to continue."
      : REASONS[firstProblem]
    : undefined;
  // Shown in the Summary on web and under the button on phones; each copy
  // has its own id for the button that it describes.
  const reasonView = (where: "web" | "phone") =>
    reason ? (
      where === "web" && liveAmountError ? (
        <InlineMessage tone="error" className="w-full">
          <span id={`${reasonId}-${where}`}>{reason}</span>
        </InlineMessage>
      ) : (
        <p id={`${reasonId}-${where}`} className="text-center type-caption text-ink-muted">
          {reason}
        </p>
      )
    ) : null;
  const submit = (where: "web" | "phone", className: string) => (
    <Button
      type="submit"
      fullWidth
      loading={sending}
      disabled={!result.ok}
      aria-describedby={reason ? `${reasonId}-${where}` : undefined}
      className={className}
    >
      {submitLabel}
    </Button>
  );

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-start gap-[1.375rem] lg:grid-cols-[minmax(0,1fr)_19.75rem] lg:gap-6"
    >
      <Card className="flex flex-col gap-[1.125rem] max-md:border-0 max-md:bg-transparent max-md:shadow-none md:p-6">
        {formError ? (
          <InlineMessage tone="error" announce="assertive">
            {formError}
          </InlineMessage>
        ) : null}
        <AccountSelect
          label="Pay from"
          accounts={accounts}
          value={input.fromAccountId}
          onValueChange={(fromAccountId) => update({ fromAccountId })}
          error={apiErrors.fromAccountId}
          disabled={sending}
        />
        <SelectField
          label="Biller"
          options={BILLER_OPTIONS}
          value={input.biller || undefined}
          placeholder="Choose a biller"
          onValueChange={(biller) => update({ biller })}
          disabled={sending}
        />
        {input.biller === OTHER_BILLER ? (
          <TextField
            label="Biller name"
            name="otherBiller"
            icon={Building2}
            autoComplete="off"
            maxLength={BILLER_MAX_LENGTH}
            value={input.otherBiller}
            onChange={(event) => update({ otherBiller: event.target.value })}
            disabled={sending}
          />
        ) : null}
        <AmountField
          label="Amount"
          name="amount"
          value={input.amount}
          onChange={(amount) => update({ amount })}
          onBlur={() => {
            // "9000" → "9,000.00" once the user moves on.
            if (amountCents !== null) update({ amount: formatAmountInput(amountCents) });
          }}
          error={apiErrors.amount ?? liveAmountError}
          disabled={sending}
          quickAmounts={[
            ...CHIPS.map(({ label, cents }) => ({
              label,
              onSelect: () =>
                update({ amount: formatAmountInput(addCents(amountCents ?? ZERO, cents)) }),
            })),
            {
              label: "Max",
              onSelect: () => from && update({ amount: formatAmountInput(toCents(from.balance)) }),
            },
          ]}
        />
      </Card>

      {/* Web: the button sits in the Summary card. Below 1024 px there is no
          summary and the button follows the fields (mobile PayBill). Only one
          is displayed at a time, so only one is in the tab order. */}
      <Card className="hidden flex-col gap-5 p-6 lg:sticky lg:top-10 lg:flex">
        <Summary
          from={from}
          biller={billerName(input)}
          amount={amountCents}
          amountInvalid={Boolean(liveAmountError)}
        />
        {reasonView("web")}
        {submit("web", "h-12")}
      </Card>
      <div className="flex flex-col items-center gap-3 lg:hidden">
        {submit("phone", "")}
        {reasonView("phone")}
      </div>
    </form>
  );
}
