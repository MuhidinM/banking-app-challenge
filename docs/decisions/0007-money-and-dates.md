# ADR-0007 · Money in integer cents; API timestamps parsed as UTC

**Status:** accepted · 2026-10-01

## Context

Amounts are JSON decimals with 2 fraction digits; JS floats drift (0.1 + 0.2). Timestamps are UTC without an offset, which `new Date()` reads as local time.

## Decision

- `toCents(number)`, `fromCents(int)`, `formatMoney(cents, { signed })` using `Intl.NumberFormat` with 2 fraction digits and the `ETB` prefix from the design. Sums, the Max chip and insufficient-funds checks use cents.
- `parseApiDate(s)` appends `Z` when no offset is present. Day grouping uses the user's local time zone; formatting goes through `Intl.DateTimeFormat`.

## Consequences

- Tests cover rounding, signed output, very large amounts, and midnight boundaries in `Africa/Addis_Ababa`.
- Ready for localisation later because all formatting goes through `Intl`.
