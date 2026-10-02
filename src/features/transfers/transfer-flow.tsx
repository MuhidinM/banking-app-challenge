"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { useAccounts } from "@/features/accounts/queries";
import { getAppSession } from "@/features/auth/session";
import { describeError } from "@/shared/api/error-messages";
import { formatMoney, toCents } from "@/shared/lib/money";
import { toast } from "@/shared/ui/toast";

import { findSentTransfer, receiptPath } from "./find-sent-transfer";
import { useSendTransfer } from "./queries";
import { TransferReceiptView } from "./transfer-receipt";
import { TransferReview } from "./transfer-review";
import { TransferScreen } from "./transfer-screen";

import type { CheckedTransfer } from "./transfer-details";

/**
 * The receipt shown when the new transaction can't be found in the history
 * (ADR-0008, step 4): what the user sent, the refreshed balance, no reference.
 */
function FallbackReceipt({ transfer }: { transfer: CheckedTransfer }) {
  const accounts = useAccounts();
  const from = accounts.data?.find((account) => account.id === transfer.from.id) ?? transfer.from;
  return (
    <TransferReceiptView
      details={{
        amount: transfer.amountCents,
        toAccountNumber: transfer.toAccountNumber,
        from,
        date: new Date(),
        newBalance: accounts.isFetching ? undefined : toCents(from.balance),
      }}
      note="The reference will show in this account's activity."
    />
  );
}

/**
 * Transfer, step by step: details, then review, then (after Confirm) the
 * receipt. The API is called only from Confirm in the review, and only once
 * per transfer, however quickly it is clicked.
 */
export function TransferFlow({ initialFromId }: { initialFromId?: number | undefined }) {
  const router = useRouter();
  const send = useSendTransfer();
  const [review, setReview] = useState<CheckedTransfer | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Sent, but looking for the new transaction (the button stays busy).
  const [resolving, setResolving] = useState(false);
  const [fallback, setFallback] = useState<CheckedTransfer | null>(null);
  // A ref, not state: two clicks in the same tick both see state from before
  // the first one re-rendered, but they share this.
  const inFlight = useRef(false);

  function confirm() {
    if (!review || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    send.mutate(review, {
      onSuccess: async () => {
        // The web design confirms with a toast; the receipt follows (N-015).
        toast({ title: `Sent ${formatMoney(review.amountCents)} to ${review.toAccountNumber}.` });
        setResolving(true);
        const sent = await findSentTransfer(getAppSession().client, review).catch(() => null);
        if (sent) {
          router.push(receiptPath(sent.id));
          return;
        }
        console.warn("[transfer] sent, but the new transaction wasn't found in the history");
        setReview(null);
        setResolving(false);
        setFallback(review);
      },
      onError: (failure) => {
        inFlight.current = false;
        setError(describeError(failure, "transfer", { availableCents: undefined }).message);
      },
    });
  }

  if (fallback) return <FallbackReceipt transfer={fallback} />;

  return (
    <>
      <TransferScreen
        initialFromId={initialFromId}
        onContinue={(transfer) => {
          setError(null);
          setReview(transfer);
        }}
      />
      <TransferReview
        transfer={review}
        sending={send.isPending || resolving}
        error={error}
        onConfirm={confirm}
        onEdit={() => {
          if (inFlight.current) return;
          setReview(null);
          setError(null);
        }}
      />
    </>
  );
}
