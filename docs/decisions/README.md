# Architecture Decision Records

Format: Context → Decision → Consequences. One decision per file. Status: proposed · accepted · superseded.

| ADR                                                 | Title                                                                      | Status   |
| --------------------------------------------------- | -------------------------------------------------------------------------- | -------- |
| [0001](0001-nextjs-app-router.md)                   | Next.js 16 App Router over Vite                                            | accepted |
| [0002](0002-client-rendered-authenticated-pages.md) | Authenticated pages are client-rendered; proxy does optimistic checks only | accepted |
| [0003](0003-token-storage.md)                       | Access token in memory, refresh token in localStorage                      | accepted |
| [0004](0004-state-management.md)                    | TanStack Query for server state, URL for filters, no global store          | accepted |
| [0005](0005-token-refresh-strategy.md)              | Reactive single-flight refresh, locked across tabs                         | accepted |
| [0006](0006-design-tokens-pipeline.md)              | Generate CSS variables from design-tokens.json                             | accepted |
| [0007](0007-money-and-dates.md)                     | Money in integer cents; API timestamps parsed as UTC                       | accepted |
| [0008](0008-receipt-resolution.md)                  | Resolve the receipt transaction after a transfer or bill payment           | accepted |
| [0009](0009-mock-mode.md)                           | MSW mock mode shared by the app, unit tests and E2E                        | accepted |
| [0010](0010-content-security-policy.md)             | Nonce-based Content-Security-Policy, pages rendered per request            | accepted |
