# Testing

What is tested, how, and how to run it. Every layer runs against one mock of the banking API, so nothing automated ever touches the shared API ([ADR-0009](decisions/0009-mock-mode.md)).

## Layers

| Layer              | Tool                                           | Where                                         | Runs                                                          |
| ------------------ | ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| Unit and component | Vitest 5, React Testing Library, MSW (node)    | `src/**/*.test.ts(x)`, `scripts/**/*.test.ts` | `pnpm test`, pre-push, CI                                     |
| End-to-end         | Playwright (Chromium), MSW in the browser, axe | `e2e/*.spec.ts`                               | `pnpm e2e`, CI                                                |
| Design fidelity    | Playwright screenshots                         | `e2e/fidelity/capture.spec.ts`                | `pnpm fidelity`, by hand                                      |
| Performance        | Lighthouse                                     | `scripts/lighthouse.mts`                      | `pnpm lighthouse`, by hand ([performance.md](performance.md)) |
| Contrast           | Vitest                                         | `scripts/design-contrast.test.ts`             | with `pnpm test`                                              |
| Generated files    | `--check` modes of the generators              | API types, design tokens                      | CI                                                            |
| Static checks      | TypeScript strict, ESLint, Prettier            | everything                                    | pre-commit, pre-push, CI                                      |

## The mock API

[`src/mocks/`](../src/mocks) is an in-memory bank behind [MSW](https://mswjs.io) handlers that follow the API's contract:

- **Every endpoint** the app uses: login, register, refresh, profile, accounts (list, create), transactions (paged), transfer, bill payment and the receipt lookups.
- **Real tokens:** JWT-shaped tokens with an expiry. Access and refresh tokens rotate on every refresh, and the old refresh token stops working. Expired tokens get `401 AUTH_005`, as the API does.
- **The API's error codes and shapes:** `AUTH_001`–`AUTH_005`, `ACC_001`–`ACC_004` (for example unknown account, insufficient funds, same account), `TXN_001`, `TXN_003`, `TXN_004`, and `VAL_001` for bodies that fail validation, in the same `ErrorResponse` JSON.
- **Spring-style pages** (`content`, `totalElements`, `number`, `last`) for accounts and history.
- **Seed data:** three demo users from the API's documentation.
  - `demo.jane` has two accounts with history.
  - `demo.john` is a transfer recipient.
  - `demo.empty` has no transactions.
- **One mock everywhere:**
  - Vitest uses it through `msw/node`, with `onUnhandledRequest: "error"`, so a request the mock doesn't handle fails the test instead of going anywhere.
  - The app uses it through the service worker when `NEXT_PUBLIC_API_MOCKING=on`. It saves the bank to `localStorage` (`kb-mock-api`), so reloads keep transfers.
  - Playwright uses the app's mock mode.
- **The mock is tested too:** [`handlers.test.ts`](../src/mocks/handlers/handlers.test.ts) holds the contract tests: login, token rotation, expiry, registration, transfers, errors and pages. [`state.test.ts`](../src/mocks/state.test.ts) tests saving and restoring.

## Unit and component tests

Next to the code they test. [`src/test/setup.ts`](../src/test/setup.ts) starts the mock server, resets handlers and seed data after every test, and cleans up React trees. It also adds the few browser APIs jsdom lacks that Radix calls.

Helpers in [`src/test/`](../src/test):

- `fake-navigation.ts` stands in for `next/navigation`, with a real URL, history, Back and Forward.
- `fake-session-environment.ts` provides storage, cookies, `BroadcastChannel` and Web Locks for session tests.
- `add-accounts.ts` seeds extra accounts.

What the suites cover, by area:

- **Session and token refresh** ([`src/features/auth`](../src/features/auth), [`src/shared/api`](../src/shared/api)):
  - Five concurrent 401s cause exactly one refresh, and all five succeed.
  - The retry uses the new token, and both rotated tokens are stored.
  - A request is retried once only.
  - A 401 from login never refreshes.
  - An expired refresh token ends the session cleanly.
  - An unreachable API keeps the session.
  - A session restores from the refresh token alone, as after a reload.
  - Across tabs: the refresh goes through the lock, a tab uses the token another tab shared while it waited, and a tab isn't logged out when another one rotated the tokens mid-call.
  - The session store and cookie, the cross-tab channel, the return-path checks (open-redirect cases), route rules and the session guard.
- **HTTP client and errors:**
  - Success, error bodies turned into `ApiError`, offline, timeout, unreachable, and caller cancellation passed through.
  - Every error code mapped to its message for each context; the server's text never shown.
  - The query client's retry rules: never for mutations, never for 4xx, and no holding a mutation while offline.
- **Money and dates** ([`src/shared/lib`](../src/shared/lib)):
  - Integer cents, parsing and formatting amounts.
  - UTC timestamps without an offset, and day grouping in another time zone, including past midnight.
  - Account number formatting and masking.
  - CSV quoting and the formula guard.
- **Forms:**
  - Login and register: field rules and messages, API errors on their fields, the return path, the expired-session banner.
  - Transfer: live insufficient funds, the same-account check, chips and Max, amount formatting on blur, server errors back on their field, review, a single send.
  - Bills and opening an account.
- **History and details:** Load more appends below and moves focus to the count at the end. A failed Load more keeps the rows. The filter works on loaded rows. Details open from `?tx=` or from a reload. CSV download.
- **After money moves:** balances and the affected histories refetch on the same screen, without a reload.
- **Layout and UI components:**
  - Skip link, route focus, sidebar and bottom nav.
  - The offline banner and its toast.
  - Buttons (loading, `asChild`), fields and their labels, dialogs (focus trap and restore), select, radio cards, toasts (live regions), empty and error states.
- **Theme:** system, light and dark; stored per device and synced across tabs; applied before the first paint.
- **Configuration:**
  - Environment validation and its messages.
  - The CSP and security headers ([security.md](security.md)).
  - The route proxy's matcher, which must never redirect the mock's service worker.
- **Design tokens:** the generator, and the contrast of every token colour pair in both themes ([N-016](spec-notes.md)).

Timeouts: Testing Library's async helpers wait up to 3 s, and a test up to 15 s. Passing tests are no slower; this only keeps a busy machine from failing slow multi-step tests.

## End-to-end tests

[`playwright.config.ts`](../playwright.config.ts) builds the app and starts it in mock mode. `NEXT_PUBLIC_API_BASE_URL` is `https://api.e2e.invalid`, a host that never resolves, so a request the mock missed fails instead of reaching a real server. CI retries a failed test once; locally there are no retries.

**A guard on every test** ([`e2e/support.ts`](../e2e/support.ts)): a test fails if the page logs a Content-Security-Policy violation, or requests any host but `localhost` and `api.e2e.invalid`. A missing mock handler or a too-strict policy shows up here rather than in a reviewer's browser.

| Spec                                                                | What it proves                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`auth.spec.ts`](../e2e/auth.spec.ts)                               | A wrong password stays on login with an error. The right one opens the dashboard. Registering signs the new customer in. A signed-out visitor goes to login and back to the page they asked for, and a `?next=` that leaves the site is ignored. The session survives a reload. Logout protects the app again, and logging out in one tab logs out the other     |
| [`token-refresh.spec.ts`](../e2e/token-refresh.spec.ts)             | An expired access token is refreshed once and the request retried, in a real browser                                                                                                                                                                                                                                                                             |
| [`accounts.spec.ts`](../e2e/accounts.spec.ts)                       | Opening an account goes to it and adds it to the list                                                                                                                                                                                                                                                                                                            |
| [`history.spec.ts`](../e2e/history.spec.ts)                         | Load more adds the next page below and stops at the end. The direction filter lives in the URL and survives reload, Back and Forward. The account selector keeps the filter. Details open through `?tx=`, survive a reload and close with Back                                                                                                                   |
| [`transfer.spec.ts`](../e2e/transfer.spec.ts)                       | A full transfer: form, review, a double-clicked Confirm that sends once, receipt, reload, and the new total on the dashboard. Account not found returns to the recipient field. Insufficient funds and the same account are refused before the review                                                                                                            |
| [`bills.spec.ts`](../e2e/bills.spec.ts)                             | A full bill payment from the form to a receipt that survives a reload                                                                                                                                                                                                                                                                                            |
| [`extras.spec.ts`](../e2e/extras.spec.ts)                           | The offline banner and the "back online" toast. A real CSV download, checked by its header. A recent recipient filling in the account number                                                                                                                                                                                                                     |
| [`accessibility.spec.ts`](../e2e/accessibility.spec.ts)             | axe (WCAG 2.0–2.2 A and AA rules) finds no violations on every page, signed out and signed in, in light and dark, on desktop and phone, and in the transaction details and transfer review dialogs. Colour contrast is checked by the contrast test instead, since some design tokens fail it by decision ([accessibility.md](accessibility.md))                 |
| [`keyboard-and-motion.spec.ts`](../e2e/keyboard-and-motion.spec.ts) | Every tab stop shows a focus indicator, on login and six signed-in pages (up to 60 Tab presses each). Login → transfer → receipt → logout, paying a bill, opening an account and the history all work with the keyboard alone. The details dialog animates only without reduced motion                                                                           |
| [`responsive.spec.ts`](../e2e/responsive.spec.ts)                   | At 360, 390, 768, 1024 and 1440 px, with extreme values planted in the mock (a long name and email, ETB 99,999,999,999.99, long and unbroken descriptions): no sideways scroll, nothing past the right edge, and every tap area at least 44 × 44 px. A huge balance shrinks to fit. A 137-character note and a long biller name fit from the form to the history |

Notes on how they work:

- **The layout checker** measures every element after running animations finish. A dialog that is still zooming in would measure 3 % small. Endless animations (skeleton pulse, spinners) are skipped.
- **Multi-page tests** are marked `test.slow()`, which triples their timeout, so a loaded machine doesn't fail them.
- **Extreme values** are planted by editing the mock's saved bank in `localStorage` and reloading; the app doesn't change.

## Fidelity screenshots

`pnpm fidelity` uses its own config, [`playwright.fidelity.config.ts`](../playwright.fidelity.config.ts), so CI's e2e job doesn't run it. It puts every screen in the state its spec frame draws and saves one PNG per frame, at 1440 × 900 or 390 × 844, in light and dark, into `docs/fidelity/`. Reduced motion, settled fonts and network, and the mouse moved away make reruns repeatable apart from the clock. The report is [fidelity.md](fidelity.md).

## Running them

| Command                                              | What it runs                                                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                                          | All unit and component tests once; `pnpm test:watch` to rerun on change, `pnpm test:coverage` for a coverage report                                |
| `pnpm e2e`                                           | Builds the app in mock mode and runs every e2e spec. First time: `pnpm exec playwright install chromium`. `E2E_PORT` picks the port (default 3003) |
| `pnpm e2e responsive`                                | One spec by name; `-g "<title>"` for one test                                                                                                      |
| `pnpm fidelity`                                      | The fidelity screenshots                                                                                                                           |
| `pnpm lighthouse`                                    | Lighthouse on every page; see [performance.md](performance.md) for the build it needs                                                              |
| `pnpm typecheck` / `pnpm lint` / `pnpm format:check` | Static checks                                                                                                                                      |

## When they run

- **Before each commit** ([`.husky/pre-commit`](../.husky/pre-commit), [`lint-staged.config.mjs`](../lint-staged.config.mjs)): ESLint with zero warnings and Prettier on the staged files.
- **Before each push** ([`.husky/pre-push`](../.husky/pre-push)): the type-check and all unit tests.
- **On every pull request and push to `main`** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)), in two jobs:
  1. **Lint, type-check, test and build:** install with the frozen lockfile, check formatting, lint, check the generated API types and design tokens are current, type-check, unit tests, production build.
  2. **End-to-end tests:** install Chromium (cached), build in mock mode, run every spec, and upload the Playwright report when a test fails.
- `main` requires both jobs to pass before a pull request can merge.

## What isn't automated

- **The real API:** it is shared, so automated runs never sign in to it. Before a release, the main flow is run by hand on the live site: sign in, dashboard, reload, a transfer between own accounts, logout.
- **Screen readers:** the project owner checked forms, errors and toasts with NVDA by hand ([accessibility.md](accessibility.md)).
