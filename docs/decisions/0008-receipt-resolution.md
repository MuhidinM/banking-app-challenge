# ADR-0008 · Resolve the receipt transaction after a transfer or bill payment

**Status:** accepted · 2026-10-01

## Context
The receipt must show amount, recipient, new balance and reference. The transfer and bill responses return only the amount and account numbers.

## Decision
After a successful mutation:
1. Fetch page 0 of the source account's transactions (newest first).
2. Pick the newest row matching type (`FUND_TRANSFER` / `BILL_PAYMENT`), direction `DEBIT`, amount, and `relatedAccount` for transfers.
3. Navigate to `/transfer/receipt/[txId]` (or `/pay-bill/receipt/[txId]`), which loads `GET /api/accounts/transfer/{id}` (or `/pay-bill/{id}`). Reference = `TX-` + zero-padded id; new balance = `balanceAfter`.
4. If nothing matches, show the receipt from the mutation response with the refreshed account balance and no reference, and log it.

## Consequences
- Receipts survive reload and can be reopened from transaction details.
- One extra request per payment — acceptable.
- Small race if two identical transfers happen at the same moment; the newest-match rule is good enough here and noted in the README.
