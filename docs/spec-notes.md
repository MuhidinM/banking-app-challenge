# Spec notes

Places where the brief, the UI spec and the API disagree or leave a gap, and what we decided.
Type: `conflict` (two sources disagree) · `gap` (design shows something the API can't provide) · `risk` (easy to get wrong).

| ID | Type | Note | Decision |
|---|---|---|---|
| N-001 | conflict | The colour page says text on primary is always white; the dark-theme `onPrimary` token is `#10202a`. Dark screens show white text on teal buttons | Follow the screens: white text on primary in both themes |
| N-002 | gap | The receipt shows reference, date and new balance; the transfer and bill-payment responses contain none of them | Resolve the new transaction from the account history and load it by id ([ADR-0008](decisions/0008-receipt-resolution.md)) |
| N-003 | conflict | The API has six account types; the design shows Savings, Checking and Money market | Show the three from the design; "More account types" reveals the other three |
| N-004 | gap | "Change password", "Forgot password?" (mobile login) and the Activity search icon have no API | Change password shown disabled with "Not available yet"; Forgot password omitted (the web login doesn't show it); search filters loaded rows client-side |
| N-005 | gap | Biller is a dropdown in the design but free text in the API | Fixed list of common Ethiopian billers plus "Other" with free text |
| N-006 | conflict | Banking apps often log out on idle; the brief suggests leaving the app open to watch the token refresh | No idle logout in this version; listed as a production consideration |
| N-007 | conflict | Web register has "Confirm password"; mobile register doesn't | Confirm password on both |
| N-008 | risk | Refresh tokens rotate; two tabs refreshing with the same token would log the user out | Refresh is locked across tabs ([ADR-0005](decisions/0005-token-refresh-strategy.md)) |
| N-009 | risk | Timestamps are UTC without an offset; `new Date()` would read them as local time | One `parseApiDate()` helper; no direct `new Date(apiString)` ([ADR-0007](decisions/0007-money-and-dates.md)) |
| N-010 | risk | The hosted API is shared | Automated tests run against MSW mocks only; a manual live smoke run before release ([ADR-0009](decisions/0009-mock-mode.md)) |
| N-011 | gap | Recipient names can't be looked up (other users' accounts return 403) | Review shows the account number, as in the design; format validated client-side; `ACC_001` shown on the recipient field |
| N-012 | gap | The design shows a Fee row; the API has no fees | Show `ETB 0.00`; total equals amount |
| N-013 | risk | A public, Kifiya-branded banking login could be mistaken for a real one | `noindex`, the spec's "Reference client for the Kifiya developer challenge" footer, brand note in README |
| N-014 | gap | "Share receipt" has no API | Web Share API with a text summary; copy-to-clipboard fallback; print stylesheet |
| N-015 | conflict | The web transfer screen shows a success toast; the brief requires a receipt screen, not only a toast | Both: toast plus receipt route |
| N-016 | conflict | The spec says all text meets WCAG AA (4.5:1) in both themes. Measured (`scripts/design-contrast.test.ts`), several token pairs don't. Light: money in on white 3.49, on its badge 3.12; money out on white 4.28, on its badge 3.74; warning banner 3.54; placeholders 3.83; focus ring (accent on white, needs 3:1) 2.80. Dark: links/outline buttons (`primary` on surface) 1.99; `primary` on `primarySoft` 1.50 | By decision the tokens are used exactly as given (only N-001 is overridden). Listed as a known limitation in the README; the test pins which pairs pass and fail, so any token change shows up. Nearest passing light shades, if this is revisited: money in `#197f45`, money out `#c33d23`, warning `#9e5b0e` |
| N-017 | conflict | The dark screens draw the primary button and links in `#17697c` (the dark `primaryHover` token), not dark `primary` `#0f5565`. Sampled from `mobile-LoginDark.png`. White text on `#17697c` is 6.27:1; as link text on the dark surface it is 2.65:1 | Decide when building buttons and links (#12): which token each component uses in dark mode |
