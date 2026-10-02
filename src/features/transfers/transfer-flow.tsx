"use client";

import { TransferScreen } from "./transfer-screen";

/**
 * Transfer, step by step: details, then review (#38), then the receipt (#39).
 * For now the checked details stop here; the review step is the next issue.
 */
export function TransferFlow({ initialFromId }: { initialFromId?: number | undefined }) {
  return <TransferScreen initialFromId={initialFromId} onContinue={() => {}} />;
}
