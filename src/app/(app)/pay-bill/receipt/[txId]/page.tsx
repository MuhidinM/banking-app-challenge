import { notFound } from "next/navigation";

import { BillReceipt } from "@/features/bills/bill-receipt";
import { readIdParam } from "@/features/transactions/url-params";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bill receipt" };

/** `/pay-bill/receipt/<transaction id>`: opened after paying a bill, and after a reload. */
export default async function BillReceiptPage({ params }: PageProps<"/pay-bill/receipt/[txId]">) {
  const { txId } = await params;
  const id = readIdParam(txId);
  if (id === null) notFound();
  return <BillReceipt transactionId={id} />;
}
