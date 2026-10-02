"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { describeError } from "@/shared/api/error-messages";
import { formatMoney } from "@/shared/lib/money";
import { toast } from "@/shared/ui/toast";

import { useSendTransfer } from "./queries";
import { TransferReview } from "./transfer-review";
import { TransferScreen } from "./transfer-screen";

import type { CheckedTransfer } from "./transfer-details";

/**
 * Transfer, step by step: details, then review, then (after Confirm) the
 * result. The API is called only from Confirm in the review, and only once
 * per transfer, however quickly it is clicked.
 */
export function TransferFlow({ initialFromId }: { initialFromId?: number | undefined }) {
  const router = useRouter();
  const send = useSendTransfer();
  const [review, setReview] = useState<CheckedTransfer | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A ref, not state: two clicks in the same tick both see state from before
  // the first one re-rendered, but they share this.
  const inFlight = useRef(false);

  function confirm() {
    if (!review || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    send.mutate(review, {
      onSuccess: () => {
        toast({ title: `Sent ${formatMoney(review.amountCents)} to ${review.toAccountNumber}.` });
        // The receipt page comes with #39; until then, the account shows the new balance.
        router.push(`/accounts/${review.from.id}`);
      },
      onError: (failure) => {
        inFlight.current = false;
        setError(describeError(failure, "transfer", { availableCents: undefined }).message);
      },
    });
  }

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
        sending={send.isPending}
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
