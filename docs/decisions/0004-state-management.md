# ADR-0004 · TanStack Query for server state, URL for filters, no global store

**Status:** accepted · 2026-10-01

## Context

The brief evaluates a clear split between server state (accounts, transactions) and UI state (forms, dialogs, theme), plus cache invalidation after mutations.

## Decision

- Server state: TanStack Query with a query-key factory per feature (`accountKeys.all`, `transactionKeys.list(accountId)`).
- URL state: activity filter, selected account, selected transaction (`?tx=`), preselected `from` account.
- Session: small external store + React context.
- Preferences (theme, hide balances): `localStorage` behind a hook.
- Forms: React state with check functions; the register form validates with a `zod/mini` schema. (Amended 2026-10-02: react-hook-form was planned but never needed. The forms are small, and the money forms re-check against the live balance on every change, which plain state does directly.)
- No Redux or Zustand — nothing needs them.

## Consequences

- Back/forward and reload keep filters and open details; links are shareable.
- Mutations invalidate by key (map in architecture.md); `queryClient.clear()` on logout prevents data leaking between users.
