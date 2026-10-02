import { notFound } from "next/navigation";

import { readIdParam } from "@/features/transactions/url-params";
import { TransferReceipt } from "@/features/transfers/transfer-receipt";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transfer receipt" };

/** `/transfer/receipt/<transaction id>`: opened after a transfer, and after a reload (X-01). */
export default async function TransferReceiptPage({
  params,
}: PageProps<"/transfer/receipt/[txId]">) {
  const { txId } = await params;
  const id = readIdParam(txId);
  if (id === null) notFound();
  return <TransferReceipt transactionId={id} />;
}
