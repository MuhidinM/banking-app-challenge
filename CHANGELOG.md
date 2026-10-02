# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-10-02

The first release: a complete web client for the Kifiya challenge banking API, live at <https://banking-app-challenge-beta.vercel.app>. Built in eleven milestones, each issue on its own branch and pull request ([project board](https://github.com/users/MuhidinM/projects/2)).

### Customer features

- **Sign in and register:**
  - Field checks match the API's rules, and API errors show on their fields.
  - The return path after sign-in is checked so it can't leave the site.
  - An expired session shows a banner on the login page, then returns the user to the page they were on.
- **Sessions:**
  - The access token is kept in memory and the refresh token in storage.
  - One shared refresh after a 401, retried once, with a lock across tabs and new tokens shared with the other tabs.
  - The session restores on reload, and logging out signs out every tab.
- **Dashboard:** the total balance across accounts (which can be hidden), quick actions, accounts, and the newest activity across all accounts.
- **Accounts:**
  - The list and each account's page, with copy and share for the account number.
  - Open an account of any of the API's six types, with an optional deposit.
- **Activity:**
  - History grouped by day, with Load more.
  - A money in / money out filter and the account picker, both kept in the URL.
  - Transaction details as a dialog or sheet, also from a link.
- **Transfer:**
  - Live checks, including insufficient funds as the amount is typed, quick amounts, and a review before sending.
  - Amounts get thousands separators as they are typed, in every money field.
  - A single send however fast Confirm is clicked.
  - A receipt with its own URL, found in the new history ([ADR-0008](docs/decisions/0008-receipt-resolution.md)).
- **Pay a bill:** six billers or any other, Pay disabled with the reason until the payment is valid, and a receipt page.
- **Profile:** the user's details, the total across accounts, the theme, and logout.
- **Theme:** light and dark from the design tokens. It follows the system, can be set on the profile page, and never flashes on reload.
- **Extras:** hide balance, copy and share the account number, share receipts, recent recipients, an offline banner with refetch on reconnect, and CSV export of the loaded history.

### Quality

- **Tests:**
  - Unit and component tests with Vitest, Testing Library and an MSW mock of the whole API.
  - End-to-end tests with Playwright on a production build: every flow, keyboard only, layouts from 360 to 1440 px, and axe on every page in both themes.
  - Every e2e test fails on a CSP violation or a request to an unexpected host ([testing.md](docs/testing.md)).
- **Accessibility:**
  - WCAG 2.2 AA, with focus moved after navigation, live regions and 44 px tap targets.
  - Reduced motion respected, and an NVDA check by hand.
  - A few colour pairs from the design's own tokens fall short of AA and are kept by decision ([accessibility.md](docs/accessibility.md)).
- **Security:**
  - A nonce-based Content-Security-Policy and security headers, no third-party scripts, and the server's error text never shown.
  - Mutations are never retried or queued while offline ([security.md](docs/security.md)).
- **Performance:** Lighthouse performance 98–100 on a simulated phone and 100 on desktop on every page. Switching to `zod/mini` cut about 320 KB of script per page ([performance.md](docs/performance.md)).
- **Design fidelity:** a screenshot of every spec frame in both themes, with each difference explained ([fidelity.md](docs/fidelity.md)).
- **CI:**
  - Format, lint, generated-file checks, type-check, unit tests and a production build, then the end-to-end tests. Both jobs are required on `main`.
  - Git hooks run the fast checks before each commit and push.

### Documentation

- A README covering setup, environment variables, features, architecture with the refresh sequence, security trade-offs, known limitations, and how AI was used.
- In [`docs/`](docs/README.md):
  - The features screen by screen, and the architecture.
  - Ten decision records.
  - Security, testing, accessibility, performance and fidelity reports.
  - API and spec notes.
  - Requirements traced to their evidence, and the backlog and workflow.

### Known limitations

See the README's "Assumptions and known limitations":

- No fees.
- Recipients are shown by number only.
- The direction filter works on the rows loaded so far.
- No search or password change, because the API has neither.
- The design tokens' contrast exceptions.
- English only.

[1.0.0]: https://github.com/MuhidinM/banking-app-challenge/releases/tag/v1.0.0
