# Design fidelity

How closely the app follows the Kifiya Banking UI spec v3, frame by frame. Each screenshot is taken by `pnpm fidelity` ([`e2e/fidelity/capture.spec.ts`](../e2e/fidelity/capture.spec.ts)) from a production build with the in-browser mock, at the frame's size (web 1440×900, mobile 390×844), in the state the frame draws, in light and dark. Files are named after the frames (`web-WebDashboard.png` is frame WebDashboard; `Dark` marks the dark version), so each can be set beside its frame in the spec. The spec's own images are not copied here.

Differences come in three kinds: decisions recorded in the [spec notes](spec-notes.md), additions for states or features the frames don't show, and sample data (times, ids). Everything else is meant to match; anything that doesn't is a bug.

## Fixed while writing this report

Setting each screenshot beside its frame found seven differences, fixed in the same change:

- **Dashboard name** was 32 px (the balance size); the frames draw it at the title size, 24 px. The phone's initials disc was 56 px, drawn 44.
- **Quick actions** on phones had 12 px between disc and label and 8 px above the disc; the redline has 8 px and none.
- **Page descriptions** ("Send money to any Kifiya Bank account.") showed on phones; the phone frames have none, so they are web only now.
- **Transfer in the bottom nav** was grey like the inactive tabs; the frames draw its label in ink on every screen.
- **"Skip to content"**, hidden above the top of the page until focused, left its shadow showing at the top of every screen.
- **Scrim in dark mode**: dialogs dimmed the page with `ink`, which is near white in dark mode, so the page behind turned light grey. Now black at 55 % in dark ([N-036](spec-notes.md)).
- **Transaction details on phones**: a long title pushed the amount onto its own line; the title wraps beside it now, as drawn.

## Across all screens

- **Dark buttons and links** use the dark `primary` token, `#0f5565`; the dark frames draw them in `#17697c` ([N-017](spec-notes.md)). Text on primary is white in both themes ([N-001](spec-notes.md)).
- **Dark balance cards** use the dark gradient token, which ends near the page colour; the dark frames draw a lighter teal card. The tokens are followed, as for N-017.
- **Amount fields** are 60 px high with a 24 px value on both sizes, from the web redline. The phone frames draw them about 68 px with a slightly larger value.
- **Quick-amount chips** are 44 px high, the spec's minimum tap size; they are drawn about 36 px ([N-019](spec-notes.md)).

## Frames

### Login

`/login?reason=expired`. Same layout, panel and banner. The frame shows a username typed in and Password focused; the screenshot is of the empty form.

| WebLogin                                                 | WebLoginDark                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| <img src="fidelity/web-WebLogin.png" width="420" alt=""> | <img src="fidelity/web-WebLoginDark.png" width="420" alt=""> |

| Login                                                    | LoginDark                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| <img src="fidelity/mobile-Login.png" width="240" alt=""> | <img src="fidelity/mobile-LoginDark.png" width="240" alt=""> |

### Register (error state)

`/register`, short password. The error is on Password, after Register, where the frame shows a mismatch on Confirm password; same field styles. Confirm password is on phones too ([N-007](spec-notes.md)) and has show/hide ([N-024](spec-notes.md)).

| WebRegister                                                 | WebRegisterDark                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| <img src="fidelity/web-WebRegister.png" width="420" alt=""> | <img src="fidelity/web-WebRegisterDark.png" width="420" alt=""> |

| Register                                                    | RegisterDark                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| <img src="fidelity/mobile-Register.png" width="240" alt=""> | <img src="fidelity/mobile-RegisterDark.png" width="240" alt=""> |

### Dashboard

`/`. The sidebar has the theme switch above the user ([N-018](spec-notes.md)). Recent activity is headed by its account ([N-027](spec-notes.md)). Times differ: the mock's seed is relative to now.

| WebDashboard                                                 | WebDashboardDark                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| <img src="fidelity/web-WebDashboard.png" width="420" alt=""> | <img src="fidelity/web-WebDashboardDark.png" width="420" alt=""> |

| Main                                                    | MainDark                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| <img src="fidelity/mobile-Main.png" width="240" alt=""> | <img src="fidelity/mobile-MainDark.png" width="240" alt=""> |

### My accounts

`/accounts`. Matches.

| Accounts                                                    | AccountsDark                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| <img src="fidelity/mobile-Accounts.png" width="240" alt=""> | <img src="fidelity/mobile-AccountsDark.png" width="240" alt=""> |

### Open an account

`/accounts/new`. "More account types" under the three drawn types ([N-030](spec-notes.md)).

| WebNewAccount                                                 | WebNewAccountDark                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| <img src="fidelity/web-WebNewAccount.png" width="420" alt=""> | <img src="fidelity/web-WebNewAccountDark.png" width="420" alt=""> |

| NewAccount                                                    | NewAccountDark                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| <img src="fidelity/mobile-NewAccount.png" width="240" alt=""> | <img src="fidelity/mobile-NewAccountDark.png" width="240" alt=""> |

### Account and activity

`/accounts/1`. A copy button beside the account number ([N-031](spec-notes.md)). The whole first page of history shows, not two rows.

| WebAccountDetail                                                 | WebAccountDetailDark                                                 |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| <img src="fidelity/web-WebAccountDetail.png" width="420" alt=""> | <img src="fidelity/web-WebAccountDetailDark.png" width="420" alt=""> |

| AccountDetail                                                    | AccountDetailDark                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| <img src="fidelity/mobile-AccountDetail.png" width="240" alt=""> | <img src="fidelity/mobile-AccountDetailDark.png" width="240" alt=""> |

### Activity

`/activity`. No search button: the API can't search ([N-004](spec-notes.md)). The frame has Money out selected; the screenshot shows All.

| Transactions                                                    | TransactionsDark                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| <img src="fidelity/mobile-Transactions.png" width="240" alt=""> | <img src="fidelity/mobile-TransactionsDark.png" width="240" alt=""> |

### Transaction details

`/accounts/1?tx=13`. A Direction row, so money in and out never rests on colour alone. The reference is the seed's id (TX-000013).

| WebTransactionDetail                                                 | WebTransactionDetailDark                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| <img src="fidelity/web-WebTransactionDetail.png" width="420" alt=""> | <img src="fidelity/web-WebTransactionDetailDark.png" width="420" alt=""> |

| TransactionDetail                                                    | TransactionDetailDark                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| <img src="fidelity/mobile-TransactionDetail.png" width="240" alt=""> | <img src="fidelity/mobile-TransactionDetailDark.png" width="240" alt=""> |

### Transfer

`/transfer`, ETB 250.00 to 2899 0108 46. The note has a 0/140 counter. The web frame's toast belongs to the moment after sending; it appears then ([N-015](spec-notes.md)). On phones the button says "Send ETB 250.00", as on web.

| WebTransfer                                                 | WebTransferDark                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| <img src="fidelity/web-WebTransfer.png" width="420" alt=""> | <img src="fidelity/web-WebTransferDark.png" width="420" alt=""> |

| Transfer                                                    | TransferDark                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| <img src="fidelity/mobile-Transfer.png" width="240" alt=""> | <img src="fidelity/mobile-TransferDark.png" width="240" alt=""> |

### Transfer review

`/transfer`, after Send. Matches.

| WebTransferReview                                                 | WebTransferReviewDark                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| <img src="fidelity/web-WebTransferReview.png" width="420" alt=""> | <img src="fidelity/web-WebTransferReviewDark.png" width="420" alt=""> |

| TransferReview                                                    | TransferReviewDark                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| <img src="fidelity/mobile-TransferReview.png" width="240" alt=""> | <img src="fidelity/mobile-TransferReviewDark.png" width="240" alt=""> |

### Transfer receipt

`/transfer/receipt/<id>`. Inside the app shell, with the navigation, and the web toast on top ([N-034](spec-notes.md)). The actions follow the details instead of sitting at the bottom of the screen.

| TransferSuccess                                                    | TransferSuccessDark                                                    |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| <img src="fidelity/mobile-TransferSuccess.png" width="240" alt=""> | <img src="fidelity/mobile-TransferSuccessDark.png" width="240" alt=""> |

### Pay a bill (insufficient funds)

`/pay-bill`, ETB 9,000.00 to Ethio Telecom. Quick amounts on phones too, and the disabled button says why: "Fix the amount to continue." The biller icon sits in a disc, like the account picker's.

| WebPayBill                                                 | WebPayBillDark                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| <img src="fidelity/web-WebPayBill.png" width="420" alt=""> | <img src="fidelity/web-WebPayBillDark.png" width="420" alt=""> |

| PayBill                                                    | PayBillDark                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| <img src="fidelity/mobile-PayBill.png" width="240" alt=""> | <img src="fidelity/mobile-PayBillDark.png" width="240" alt=""> |

### Profile

`/profile`. A Theme card ([N-018](spec-notes.md)); Change password is disabled with "Not available yet": the API has no endpoint for it ([N-004](spec-notes.md)).

| WebProfile                                                 | WebProfileDark                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| <img src="fidelity/web-WebProfile.png" width="420" alt=""> | <img src="fidelity/web-WebProfileDark.png" width="420" alt=""> |

| Profile                                                    | ProfileDark                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| <img src="fidelity/mobile-Profile.png" width="240" alt=""> | <img src="fidelity/mobile-ProfileDark.png" width="240" alt=""> |

## Refreshing the screenshots

```bash
pnpm fidelity
```

It builds the app in mock mode, as `pnpm e2e` does, and overwrites `docs/fidelity/`. Times and the greeting follow the clock, so a fresh run differs in those.
