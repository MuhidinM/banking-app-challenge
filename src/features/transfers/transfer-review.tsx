"use client";

import { CircleAlert } from "lucide-react";

import { accountChoiceLabel } from "@/features/accounts/account-select";
import { formatMoney, ZERO } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { InlineMessage } from "@/shared/ui/feedback";

import type { CheckedTransfer } from "./transfer-details";

interface TransferReviewProps {
  /** The transfer to review; the dialog is open while there is one. */
  transfer: CheckedTransfer | null;
  sending: boolean;
  /** Already in user-facing words (describeError). */
  error: string | null;
  onConfirm: () => void;
  /** Back to the form, with everything as it was typed. */
  onEdit: () => void;
}

/**
 * The last look before money moves (UI spec, WebTransferReview dialog and
 * mobile TransferReview sheet): the amount, from, to, fee and note, and the
 * warning that transfers can't be reversed. Nothing is sent until Confirm.
 */
export function TransferReview({
  transfer,
  sending,
  error,
  onConfirm,
  onEdit,
}: TransferReviewProps) {
  const rows: [string, string][] = transfer
    ? [
        ["From", accountChoiceLabel(transfer.from).replace(" · ", " ")],
        // Recipient names can't be looked up, so the number is what the user checks (N-011).
        ["To", transfer.toAccountNumber],
        ["Fee", formatMoney(ZERO)],
        ...(transfer.note ? ([["Note", transfer.note]] as [string, string][]) : []),
      ]
    : [];

  return (
    <Dialog
      title="Review transfer"
      description={
        transfer
          ? `Send ${formatMoney(transfer.amountCents)} to ${transfer.toAccountNumber}.`
          : undefined
      }
      open={transfer !== null}
      // Closing (Escape, backdrop, the X) is the same as Edit details, except while sending.
      onOpenChange={(open) => {
        if (!open && !sending) onEdit();
      }}
      footer={
        <>
          <Button fullWidth loading={sending} onClick={onConfirm}>
            Confirm and send
          </Button>
          <Button variant="ghost" fullWidth size="compact" disabled={sending} onClick={onEdit}>
            Edit details
          </Button>
        </>
      }
    >
      {transfer ? (
        <div className="flex flex-col gap-5">
          <p className="text-center type-display amount text-ink">
            {formatMoney(transfer.amountCents)}
          </p>

          <dl className="divide-y divide-border rounded-card border border-border">
            {rows.map(([term, value]) => (
              <div key={term} className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                <dt className="type-body text-ink-muted">{term}</dt>
                <dd className="min-w-0 text-right type-body break-words text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {error ? (
            <InlineMessage tone="error" announce="assertive">
              {error}
            </InlineMessage>
          ) : (
            <InlineMessage tone="warning" icon={CircleAlert}>
              Transfers are instant and cannot be reversed. Check the account number.
            </InlineMessage>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
