# Design notes

Source: Kifiya Banking UI spec v3 (2026-09-30), local copy in `reference/`. Tokens: `design/design-tokens.json`.
Web frames 1440×900, mobile 390×844, PNGs at 2×, redline values in CSS px at 1×.

## Screens

| Screen                           | Web PNG                               | Mobile PNG                | Redline      | Route                      |
| -------------------------------- | ------------------------------------- | ------------------------- | ------------ | -------------------------- |
| Login (+ session expired banner) | WebLogin                              | Login                     | web + mobile | `/login`                   |
| Register (error state)           | WebRegister                           | Register                  | —            | `/register`                |
| Dashboard / Home                 | WebDashboard                          | Main                      | web + mobile | `/`                        |
| My accounts                      | (sidebar → Accounts)                  | Accounts                  | —            | `/accounts`                |
| Open an account                  | WebNewAccount                         | NewAccount                | mobile       | `/accounts/new`            |
| Account & activity               | WebAccountDetail                      | AccountDetail             | mobile       | `/accounts/[accountId]`    |
| Activity (filter)                | —                                     | Transactions              | —            | `/activity`                |
| Transaction detail               | WebTransactionDetail (modal)          | TransactionDetail (sheet) | —            | `?tx=<id>`                 |
| Transfer · details + summary     | WebTransfer                           | Transfer                  | web + mobile | `/transfer`                |
| Transfer · review                | WebTransferReview (dialog)            | TransferReview (sheet)    | mobile       | dialog on `/transfer`      |
| Transfer · receipt               | (toast "Sent ETB 250.00 to …" on web) | TransferSuccess           | —            | `/transfer/receipt/[txId]` |
| Pay a bill (insufficient funds)  | WebPayBill                            | PayBill                   | —            | `/pay-bill`                |
| Profile                          | WebProfile                            | Profile                   | —            | `/profile`                 |
| Components sheet                 | Components                            | —                         | components   | —                          |

Note: the web transfer screen shows a success toast. The brief requires a receipt screen, not only a toast — we do both (toast + receipt route).

## Layout

- **Web (≥768):** sidebar 260 px (logo, Home, Accounts, Activity, Transfer, Profile; user card + logout at bottom). Content max 1024 px, 40 px padding, 24 px grid gap. Two-column forms: form card + Summary card.
- **Mobile (<768):** bottom tab bar (Home, Accounts, **Transfer** raised 56 px disc, Activity, Profile), icon 22, label 12. Page padding 20 left/right, 56 top (48 with back button), section gap 24 (22 dense). Dialogs become bottom sheets.
- Auth pages web: left gradient panel with headline ("Banking that fits in your day." / "Open your account in a minute."), right white panel with form.

## Tokens (summary)

- Colours: see `design-tokens.json` (light + dark). Money in = `credit`, money out = `debit`, used **only** for money direction. Orange = accent: focus rings, logo dot, warnings.
- Type: Raleway 600 for display 32 / title 24 / heading 18; Montserrat bodyStrong 15/500, body 14/400, label 13/500, caption 12/400 (minimum). Line-height 1.2 display, 1.4 others.
- Numbers: tabular figures, never wrap. Format `ETB 2,200.00`; signed `+ETB` / `−ETB` in lists.
- Radius: card 16, control 12, button 14, pill 999. Shadows: `card`, `float`. 4 px grid.
- Sizes: control/button 52 (compact 44), min hit 44, row min 72, icon 20, disc 44, quick-action disc 60 (web 56), icon 26.
- Focus: controls = 3 px `accentSoft` ring + `accent` border; buttons/links = 2 px `accent` outline, offset 2.
- Field style: **option C — outlined** (white surface, 1 px border) per `decisions-FieldStyles.png`.
- Balance card gradient: light `120deg #02404f → #0f5565 → #2f8397`, dark `120deg #0f5565 → #02404f → #0a1519`.
- Contrast: WCAG AA in both themes; `inkSubtle` only for placeholders and inactive icons.

## Component inventory (from the component sheet)

Buttons: Primary, Soft, Outline, Ghost, Danger, Disabled, Loading, With icon, Compact 44 (outline + primary).
Fields: Default, Focused, Filled with hint, Error, Disabled, Select. Money: account select (with available balance), amount (ETB prefix, large value, quick chips +100 / +500 / +1,000 / Max; bills +50 / +100 / +500 / Max).
Rows: account row (icon disc, type, masked number `•••• 8057`, balance + "Available", chevron), transaction row (type icon disc, title, meta "Refund · 15:18", signed amount).
Filters, badges (type pill e.g. "Refund"), info message, loading skeleton, empty state.

## Formatting rules

- Account number masked in rows: `•••• 8057` (last 4). Full on detail card: `8751 1380 57` (4-4-2). Input format: `2899 0108 46`.
- Greeting: "Good morning / afternoon / evening" by local time, then full name.
- Transaction meta: `<Type label> · HH:mm`. Day headers: Today, Yesterday, `Sunday, 30 Aug`.
- Reference: `TX-` + id zero-padded to 6 (`TX-000117`).
- Initials avatar: first letters of first + last name.

## Icons (lucide)

Transfer `ArrowLeftRight`, Pay bill `ReceiptText`, New account `Plus`, Accounts `CreditCard`, Home `House`, Activity `ScrollText`, Profile `User`, Checking `Landmark`, Savings `PiggyBank`/`CircleDollarSign`, Money market `Percent`, Refund `RotateCcw`, Fee `Percent`, ATM `Banknote`, Money in `ArrowDownLeft`, Money out `ArrowUpRight`, Share `Share`, Logout `LogOut`, Eye `Eye`/`EyeOff`. Final choices go in the component file; keep one family.
