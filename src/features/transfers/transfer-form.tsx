"use client";

import { Hash, ReceiptText } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { AccountSelect, accountChoiceLabel } from "@/features/accounts/account-select";
import type { Account } from "@/shared/api/types";
import { formatAccountNumber, normalizeAccountNumber } from "@/shared/lib/account-number";
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
import { TextField } from "@/shared/ui/text-field";

import {
  type CheckedTransfer,
  NOTE_MAX_LENGTH,
  type TransferErrors,
  type TransferField,
  type TransferInput,
  amountError,
  checkTransfer,
} from "./transfer-details";

const CHIPS: { label: string; cents: Cents }[] = [
  { label: "+100", cents: toCents(100) },
  { label: "+500", cents: toCents(500) },
  { label: "+1,000", cents: toCents(1000) },
];

/** Summary (UI spec, WebTransfer): the details as entered, fee and total. */
function Summary({
  from,
  toAccountNumber,
  amount,
}: {
  from: Account | undefined;
  toAccountNumber: string;
  amount: Cents | null;
}) {
  const rows: [string, string][] = [
    ["From", from ? accountChoiceLabel(from).replace(" · ", " ") : "—"],
    ["To", normalizeAccountNumber(toAccountNumber) || "—"],
    ["Amount", amount === null ? "—" : formatMoney(amount)],
    // The API charges no fee (N-012).
    ["Fee", formatMoney(ZERO)],
  ];
  return (
    <>
      <h2 className="type-heading text-ink">Summary</h2>
      <dl className="flex flex-col gap-3.5">
        {rows.map(([term, value]) => (
          <div key={term} className="flex items-baseline justify-between gap-4">
            <dt className="type-body text-ink-muted">{term}</dt>
            <dd className="truncate type-body amount text-ink">{value}</dd>
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

interface TransferFormProps {
  accounts: readonly Account[];
  /** From `?from=<id>` (the account page's Transfer shortcut), if it is one of the user's. */
  initialFromId?: number | undefined;
  /** Called with the checked details; the review step (#38) takes it from there. */
  onContinue: (transfer: CheckedTransfer) => void;
  /**
   * An error the API returned for one field (e.g. ACC_001 on the recipient).
   * Shown on that field, which gets focus; a new `id` shows it again.
   */
  serverError?: ServerFieldError | null;
}

export interface ServerFieldError {
  field: TransferField;
  message: string;
  id: number;
}

/** The control to focus for a field (the From picker is a combobox button). */
const fieldSelector = (field: TransferField) =>
  field === "fromAccountId" ? "button[role=combobox]" : `input[name="${field}"]`;

/**
 * The transfer form (UI spec, WebTransfer and mobile Transfer): from, to,
 * amount with quick chips, optional note. Everything is checked before the
 * review step; "Insufficient funds" shows as soon as the amount is too high.
 */
export function TransferForm({
  accounts,
  initialFromId,
  onContinue,
  serverError,
}: TransferFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [input, setInput] = useState<TransferInput>(() => ({
    fromAccountId: accounts.find((account) => account.id === initialFromId)?.id ?? accounts[0]?.id,
    toAccountNumber: "",
    amount: "",
    note: "",
  }));
  // Errors show after the first Continue; the balance check shows at once.
  const [checked, setChecked] = useState(false);
  const [errors, setErrors] = useState<TransferErrors>({});
  // The API's error shows until the user changes that field (which dismisses it).
  const [dismissedServerError, setDismissedServerError] = useState<number | null>(null);
  const serverErrors: TransferErrors =
    serverError && serverError.id !== dismissedServerError
      ? { [serverError.field]: serverError.message }
      : {};

  useEffect(() => {
    if (serverError) {
      formRef.current?.querySelector<HTMLElement>(fieldSelector(serverError.field))?.focus();
    }
  }, [serverError]);

  const from = accounts.find((account) => account.id === input.fromAccountId);
  const amountCents = parseAmountInput(input.amount);
  const liveAmountError = amountError(input.amount, from);

  function update(changes: Partial<TransferInput>) {
    const next = { ...input, ...changes };
    setInput(next);
    if (serverError && serverError.field in changes) setDismissedServerError(serverError.id);
    if (checked) {
      const result = checkTransfer(next, accounts);
      setErrors(result.ok ? {} : result.errors);
    }
  }

  // The form's own checks first; for the amount, the live balance check (it
  // uses the freshest balance) before what the API said.
  const errorFor = (field: TransferField) =>
    errors[field] ?? (field === "amount" ? liveAmountError : undefined) ?? serverErrors[field];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecked(true);
    const result = checkTransfer(input, accounts);
    if (!result.ok) {
      setErrors(result.errors);
      const first = (["fromAccountId", "toAccountNumber", "amount", "note"] as const).find(
        (field) => result.errors[field],
      );
      if (first) event.currentTarget.querySelector<HTMLElement>(fieldSelector(first))?.focus();
      return;
    }
    setErrors({});
    onContinue(result.transfer);
  }

  const submitLabel =
    amountCents !== null && amountCents > 0 ? `Send ${formatMoney(amountCents)}` : "Continue";

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="grid grid-cols-1 items-start gap-[1.375rem] lg:grid-cols-[minmax(0,1fr)_19.75rem] lg:gap-6"
    >
      <Card className="flex flex-col gap-[1.125rem] max-md:border-0 max-md:bg-transparent max-md:shadow-none md:p-6">
        <AccountSelect
          label="From"
          accounts={accounts}
          value={input.fromAccountId}
          onValueChange={(fromAccountId) => update({ fromAccountId })}
          error={errorFor("fromAccountId")}
        />
        <TextField
          label="To account number"
          name="toAccountNumber"
          icon={Hash}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0000 0000 00"
          maxLength={12}
          value={input.toAccountNumber}
          onChange={(event) => update({ toAccountNumber: formatAccountNumber(event.target.value) })}
          hint="Kifiya Bank account numbers have 10 digits."
          error={errorFor("toAccountNumber")}
        />
        <AmountField
          label="Amount"
          name="amount"
          value={input.amount}
          onChange={(amount) => update({ amount })}
          onBlur={() => {
            // "9000" → "9,000.00" once the user moves on.
            if (amountCents !== null) update({ amount: formatAmountInput(amountCents) });
          }}
          error={errorFor("amount")}
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
        <TextField
          label="Note (optional)"
          name="note"
          icon={ReceiptText}
          placeholder="e.g. Rent for September"
          maxLength={NOTE_MAX_LENGTH}
          value={input.note}
          onChange={(event) => update({ note: event.target.value })}
          hint={`${input.note.length}/${NOTE_MAX_LENGTH}`}
          error={errorFor("note")}
        />
      </Card>

      {/* Web: the button sits in the Summary card. Below 1024 px there is no
          summary, and the button follows the fields (mobile Transfer). Only one
          is displayed at a time, so only one is in the tab order. */}
      <Card className="hidden flex-col gap-5 p-6 lg:sticky lg:top-10 lg:flex">
        <Summary from={from} toAccountNumber={input.toAccountNumber} amount={amountCents} />
        <Button type="submit" fullWidth className="h-12">
          {submitLabel}
        </Button>
      </Card>
      <Button type="submit" fullWidth className="lg:hidden">
        {submitLabel}
      </Button>
    </form>
  );
}
