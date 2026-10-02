# Features

What every screen does, in detail: what it shows, where the data comes from, every check and message, the states, what lives in the URL, and what happens afterwards. Messages are quoted as the app shows them. Endpoints are described in [api-notes.md](api-notes.md); the choices behind behaviour are in [spec-notes.md](spec-notes.md) (N-xxx) and [decisions/](decisions/README.md) (ADR-xxxx). Screenshots of every screen are in [fidelity.md](fidelity.md).

## Common to every screen

- **Loading:** grey skeletons in the shape of the content, inside a status region named for what is loading ("Loading transactions"). A route still loading its code shows a header and a card of row skeletons ("Loading the page").
- **Errors:** errors come from the API's error code, never from the server's own text ([error-messages.ts](../src/shared/api/error-messages.ts)). Network failures have their own messages:
  - Offline: "You're offline. Check your connection and try again."
  - Too slow: "The bank is taking too long to respond. Please try again."
  - Unreachable: "Can't reach the bank right now. Check your connection and try again."
  - Server error: "Something went wrong on our side. Please try again."

  Lists and details that fail show an error card with **Try again** when retrying could help. Queries retry by themselves up to twice for network and server errors, never for 4xx answers. Money is never retried.

- **Empty states** say what is missing and offer the next step, such as "Open an account".
- **Layout:**
  - From 768 px, a 260 px sidebar: Home, Accounts, Activity, Transfer, Profile, with the user card and logout at the bottom.
  - Below 768 px, a bottom bar with the same five sections and Transfer on a raised disc.
  - The current section is marked, also for screen readers (`aria-current="page"`). Content is at most 1024 px wide.
- **After navigation**, focus moves to the new page's heading ([accessibility.md](accessibility.md)).
- **Toasts** appear at the top centre and close by themselves after 5 seconds, or with their X. Errors are announced at once, the rest politely.

## Sign in · `/login`

[login-form.tsx](../src/features/auth/login-form.tsx)

- **Fields:** username and password, with a show/hide button on the password.
- **Before sending:** an empty field says "Enter your username." or "Enter your password.", and focus goes to it.
- **Login:** sends `POST /api/auth/login`. The button shows a spinner and stays busy until the next page replaces this one, so it can't be sent twice.
- **Wrong details:** "Username or password is incorrect.", above the form, with focus on the password.
- **Where it goes next:** the page in `?next=` if it is a path on this site, otherwise the dashboard. A `?next=` that would leave the site is ignored ([security.md](security.md)).
- **"Your session expired. Please sign in again."** shows when the URL has `?reason=expired`, or when this tab's session just ended because the refresh token was rejected. It is announced politely.
- **Already signed in:** visiting `/login` goes straight on to `?next=` or the dashboard.
- **Layout:** on web, a brand panel on the left with the form on the right. On phones, the form alone. The title is 26 px, as drawn ([N-023](spec-notes.md)).

## Create your account · `/register`

[register-form.tsx](../src/features/auth/register-form.tsx), [register-schema.ts](../src/features/auth/register-schema.ts)

| Field            | Rule (same as the API)                       | Message                                                                    |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| First name       | required, trimmed                            | "Enter your first name."                                                   |
| Last name        | required, trimmed                            | "Enter your last name."                                                    |
| Username         | 3–50 characters, trimmed                     | "Choose a username." / "Username must be 3 to 50 characters."              |
| Phone number     | digits, spaces, `+ . ( ) -`, 7–25 characters | "Enter your phone number." / "Enter a phone number like +251 911 234 567." |
| Email (optional) | empty, or a valid address                    | "Enter an email address like you@example.com."                             |
| Password         | at least 6 characters, not trimmed           | "Choose a password." / "Password must be at least 6 characters."           |
| Confirm password | equal to the password                        | "Repeat your password." / "Passwords do not match."                        |

- **When errors show:** after the first Register, then live as you correct each field. Confirm password and show/hide are on both phone and web ([N-007](spec-notes.md), [N-024](spec-notes.md)).
- **API errors on their fields:** a taken username shows "This username is taken. Try another." on Username. A used email shows "An account with this email already exists." on Email. Focus goes to the field.
- **On success:** the API opens a checking account automatically. The app then signs the customer in and goes to the dashboard, with the toast "Welcome, <first name>. Your account is ready." and "Your checking account <number> was opened for you."
- **If the automatic sign-in fails** (the connection dropped): "Your account is ready. Please sign in." and the login page.
- An empty email is left out of the request.

## Dashboard · `/`

[src/features/dashboard/](../src/features/dashboard)

- **Header:** "Good morning", "Good afternoon" (from 12:00) or "Good evening" (from 17:00) by the device's clock, and the user's full name (`GET /api/users/profile`). On web, Transfer and Pay bill buttons sit on the right. On phones, an initials disc that opens the profile.
- **Total balance:** the sum of every account (all pages of `GET /api/accounts`), with "Across N accounts". The eye button hides it as "ETB ******" ("Hidden" to screen readers), here and on the profile page, and the choice is remembered on this device. A very large total shrinks to fit instead of overflowing ([N-035](spec-notes.md)).
- **Quick actions:** Transfer, Pay bill, New account, Accounts.
- **My accounts:** up to three accounts (type, masked number, balance), each opening its page, with View all.
- **Recent activity:** the newest three transactions across all the user's accounts, newest first. With more than one account, each row starts with its account ("•••• 8911 · Transfer · 15:04"), and screen readers hear it in full ("Savings •••• 8911"). View all opens Activity ([N-027](spec-notes.md)). Each account is asked for its newest three and the results are merged by time; an account whose request fails is left out, so it can't hide the others.
- **Empty:** with no accounts, "Open an account to start banking." With no transactions, "Money in and out of this account will show here."

## My accounts · `/accounts`

[accounts-list.tsx](../src/features/accounts/accounts-list.tsx)

- **Summary:** "N accounts · ETB x total" under the title.
- **Each account:** type icon, type, masked number ("•••• 8057"), balance with "Available", and a chevron. All pages of accounts are loaded, 50 at a time.
- **Opening another:** a dashed "Open another account" row, and a New button.
- **Empty:** "No accounts yet", with "Open a checking or savings account to start banking."

## Open an account · `/accounts/new`

[open-account-form.tsx](../src/features/accounts/open-account-form.tsx)

- **Account type:** Savings, Checking and Money market, each with a one-line description. "More account types" reveals Retirement, Fixed-term deposit and Blocked account, the API's other three ([N-030](spec-notes.md)).
- **Initial deposit (optional):** "Leave empty to start at ETB 0.00." Anything that isn't an amount says "Enter an amount like 250.00, or leave it empty."
- **Open account:** sends `POST /api/accounts`. On success the toast is "<Type> account opened." with "Account <number>, balance <deposit>.". The app then goes to the new account's page, and the account list and total refresh.
- **API errors:** a negative deposit (`TXN_001`) shows "Enter an amount of ETB 0.00 or more." on the deposit field. Other errors show above the form.
- **Cancel** returns to the accounts list.

## Account · `/accounts/<id>`

[account-details.tsx](../src/features/accounts/account-details.tsx)

- **Balance card:** type, the full account number in groups ("8751 1380 57") and the available balance.
- **Copy:** a copy button beside the number says "Account number copied." (or "Couldn't copy the account number.").
- **Share** (phones): the share button opens the device's share sheet with the number. It copies the number where sharing isn't available ([N-031](spec-notes.md)).
- **Shortcuts:** Transfer and Pay bill open those forms with this account already chosen (`?from=<id>`).
- **Activity:** this account's history with the All / Money in / Money out filter ([Activity](#activity--activity)). The filter is kept in `?direction=`.
- **An id that isn't one of the user's accounts** shows "Page not found".

## Activity · `/activity`

[account-activity.tsx](../src/features/transactions/account-activity.tsx), [transaction-history.tsx](../src/features/transactions/transaction-history.tsx)

- **Account picker and filter:** pick an account (each option shows its available balance), then All, Money in or Money out.
  - Both live in the URL (`?account=1&direction=DEBIT`), so reload, Back, Forward and shared links keep them. Each change is a new history entry. Without `?account=`, the first account shows.
  - An account that isn't the user's shows "We couldn't find this account." with "It isn't one of your accounts. Choose one above."
- **History:** from `GET /api/transactions/<accountId>`, newest first, 10 at a time, grouped under Today, Yesterday or the date ("Sunday, 30 Aug"), in the user's time zone ([ADR-0007](decisions/0007-money-and-dates.md)).
- **Each row:** a type icon, the description, the type and time ("Refund · 15:18"), and the signed amount ("+ETB 1,665.00", "−ETB 15.00"; money in in green).
  - A transaction without a description is named from its type and the other account, for example "Transfer from 9402 1799 20".
  - Screen readers hear each row as one sentence.
- **Load more** adds the next page below the rows already shown, under "Showing x of y". At the end the button goes away and focus moves to the count.
  - If loading more fails, the rows stay and the error shows under the button.
  - A transaction that arrived between two clicks is shown once, not twice ([N-025](spec-notes.md)).
- **Filter on loaded rows:** the API can't filter by direction, so the filter applies to the rows loaded so far ([N-029](spec-notes.md)). If none match, the page says how many were checked, for example "None of the 10 transactions loaded so far. Load more to look further back."
- **Download CSV:** saves the rows on screen as `kifiya-<account>-<date>.csv` (Extras, below).
- **Empty:** "No transactions yet", with "Money in and out of this account will show here."

## Transaction details · `?tx=<id>`

[transaction-details.tsx](../src/features/transactions/transaction-details.tsx)

- **Where it opens:** clicking a row on Activity, an account page or the dashboard opens the details: a dialog on web, a sheet from the bottom on phones. The id goes into the URL (`?tx=117`), so the details survive a reload and can be linked. Back closes them.
- **What it shows:** the type icon, description, date and time, signed amount, and these rows:
  - Type, as a badge.
  - Direction: Money in or Money out.
  - Account.
  - From or To: the other account, when there is one.
  - Reference: "TX-" and the id padded to six digits.
  - Balance after, when the API sends it.
- **Share receipt:** shares a text receipt through the device's share sheet, or copies it ("Receipt copied", "Paste it wherever you need it.").
- **Opened from a link or a reload:** the row comes from the loaded list when it is there. Otherwise the app reads the account's history newest first, 50 rows a request, up to 20 pages ([N-026](spec-notes.md)). An id it can't find shows "We couldn't find this transaction." with "It isn't in this account's history."
- **Closing:** focus returns to the row it was opened from.

## Transfer · `/transfer`

[transfer-form.tsx](../src/features/transfers/transfer-form.tsx), [transfer-details.ts](../src/features/transfers/transfer-details.ts)

- **From:** one of the user's accounts, with its available balance. `?from=<id>` preselects one.
- **To account number:** digits only, grouped as typed ("2899 0108 46"). Hint: "Kifiya Bank account numbers have 10 digits."
  - **Recent** chips below fill in up to three accounts the chosen account sent money to lately, taken from its history (Extras, below).
- **Amount:**
  - "ETB" prefix. Thousands separators appear as you type ("1234567" shows as "1,234,567"), and the caret stays where you are typing. Up to two decimals; "9000" becomes "9,000.00" when you leave the field. The same field is used for bills and the opening deposit.
  - +100, +500 and +1,000 add to the amount, in cents. Max fills in the balance.
- **Note (optional):** up to 140 characters, with a counter ("0/140").
- **Summary** (from 1024 px): From, To, Amount, Fee ETB 0.00 and Total, beside the form. The send button is in it ("Send ETB 250.00"). Below 1024 px the button follows the fields. The API charges no fee ([N-012](spec-notes.md)).

Checks, all before anything is sent:

| Field  | Message                                                                                                                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| From   | "Choose the account to send from."                                                                                                                                                                         |
| To     | "Enter the recipient's account number." / "Kifiya Bank account numbers have 10 digits." / "Cannot transfer to the same account."                                                                           |
| Amount | "Enter an amount." / "Enter an amount like 250.00." / "Enter an amount greater than ETB 0.00." / "The most you can send at once is ETB 1,000,000,000.00." / "Insufficient funds. Available: ETB 8,640.00." |
| Note   | "Keep the note to 140 characters."                                                                                                                                                                         |

- **When they show:** "Insufficient funds" shows as soon as the amount is more than the balance. The other messages appear on the first Send, then update as you type, and focus goes to the first field in error ([N-033](spec-notes.md)).
- **Nothing is sent from the form.** Send opens the review.

### Review

[transfer-review.tsx](../src/features/transfers/transfer-review.tsx)

- **What it shows:** a dialog on web, a sheet on phones. The amount in large type (a huge amount shrinks to fit), then From, To, Fee and the note, and the warning "Transfers are instant and cannot be reversed. Check the account number."
- **Confirm and send:** sends `POST /api/accounts/transfer` once, however fast it is clicked. The button stays busy until the receipt opens.
- **Edit details, Escape, the X or the backdrop:** go back to the form with everything as typed. This is blocked while sending.
- **An error that belongs to a field** goes back to the form, on that field, with focus there:
  - Account not found: "Account not found. Check the number."
  - Insufficient funds: "Insufficient funds. Available: …". The balances refresh too, since the server's is newer.
  - Same account: "Cannot transfer to the same account."
  - Amount: "Enter an amount greater than ETB 0.00."

  The message clears when that field changes.

- **Other errors** (offline, server) stay in the review, so the user can try again.
- **Offline:** a transfer confirmed offline fails at once with the offline message. It is never held and sent later.

### After sending

- **Toast:** "Sent ETB 250.00 to 2899010846." ([N-015](spec-notes.md)).
- **Refresh:** balances, the source account's history and, for a transfer to another of the user's accounts, that account's history refetch. Every screen agrees without a reload.
- **Receipt:** the API's answer has no transaction id. The app finds the new transaction on the first page of the source account's history and opens its receipt ([ADR-0008](decisions/0008-receipt-resolution.md)).
- **If it can't be found,** the same receipt shows without a reference, with the refreshed balance and "The reference will show in this account's activity."

## Transfer receipt · `/transfer/receipt/<id>`

[transfer-receipt.tsx](../src/features/transfers/transfer-receipt.tsx)

- **Loaded by id** (`GET /api/accounts/transfer/<id>`), so it survives a reload and can be linked.
- **What it shows:**
  - Sent: "Transfer sent" and "ETB 250.00 to 2899010846". Received: "Transfer received" and "… from …".
  - Then From (or To), Date, Reference and New balance.
- **Share receipt** sends or copies a text version.
- **Done** goes to the dashboard. The receipt is a page inside the app, with the navigation ([N-034](spec-notes.md)).
- **A receipt that isn't the user's** shows "We couldn't find this receipt" with "It may belong to another account. Your transfers are in each account's activity." and View activity.

## Pay a bill · `/pay-bill`

[bill-form.tsx](../src/features/bills/bill-form.tsx), [bill-details.ts](../src/features/bills/bill-details.ts)

- **Pay from:** one of the user's accounts. `?from=<id>` preselects one.
- **Biller:** Ethio Telecom, Ethiopian Electric Utility, Addis Ababa Water and Sewerage Authority, Safaricom Ethiopia, DStv Ethiopia, Canal+ Ethiopia, or Other. Other asks for the biller's name, up to 80 characters.
- **Amount:** as on Transfer, with +50, +100, +500 and Max.
- **Summary** (from 1024 px): Pay from, Biller, Amount, Fee and Total.
- **Pay stays disabled until the payment is valid,** with the reason beside it:
  - "Choose an account to continue."
  - "Choose a biller to continue."
  - "Enter the biller's name to continue."
  - "Enter an amount to continue."
  - "Fix the amount to continue."

  "Insufficient funds. Available: …" shows on the amount as it is typed.

- **Pay sends.** The design has no review step for bills. The button reads "Pay ETB 9,000.00" once there is an amount.
- **After paying:**
  - The toast "Paid ETB 235.00 to Ethio Telecom.".
  - The same refresh as a transfer.
  - The receipt, found in the history as for transfers.
- **API errors:** go on their field (insufficient funds, amount, an account that isn't the user's), or above the form.

## Bill receipt · `/pay-bill/receipt/<id>`

[bill-receipt.tsx](../src/features/bills/bill-receipt.tsx)

"Bill paid", with the amount and the biller, then From, Date, Reference and New balance, loaded by id (`GET /api/accounts/pay-bill/<id>`). Share receipt and Done work as on the transfer receipt.

## Profile · `/profile`

[profile.tsx](../src/features/profile/profile.tsx)

- **The user:** initials, full name, `@username`, email, phone, user id and username.
- **The total across all accounts**, with the number of accounts.
- **Theme:** System, Light or Dark. It is stored on this device, synced to other tabs, and applied before the first paint, so a reload never flashes the wrong theme. This is the only theme control; the design shows none ([N-018](spec-notes.md)).
- **Change password** is shown disabled with "Not available yet": the API has no endpoint for it ([N-004](spec-notes.md)).
- **Log out**, with "Signed in as <username>".

## Not found and errors

- **Page not found:** "The page you're looking for doesn't exist or has moved.", inside the app for signed-in pages.
- **Errors while rendering:** "This page couldn't load", with the error's message and Try again. A failure in the root layout gets its own minimal page, still themed.

## Across the app

### Sessions

- **Restoring:** on load, a stored refresh token is exchanged once to restore the session. If the API is unreachable, the user stays signed in and requests retry.
- **Refresh:** access tokens last 10 minutes. A 401 triggers one refresh shared by every request that failed, and each request is retried once. Tabs never refresh at the same time ([ADR-0005](decisions/0005-token-refresh-strategy.md)).
- **Expiry:** when the refresh token is rejected, every tab goes to `/login?reason=expired`. After signing in, the user returns to the page they were on.
- **Logout:** logging out in one tab logs out every tab. Cached data and toasts are cleared, so nothing from one session shows in the next.
- **Route protection:** signed-out visitors to app pages go to `/login?next=<page>`, and signed-in visitors to `/login` or `/register` go on to the app.

### Extras

- **Hide balance:** the eye button on the dashboard. The choice is remembered on this device.
- **Copy and share account number:** on each account's page.
- **Share receipt:** on transfer and bill receipts and in transaction details. It uses the device's share sheet, or copies the text.
- **Recent recipients:** on Transfer, up to three "Recent" chips under the account number. They come from the outgoing transfers on the first page of the chosen account's history, newest first, each once. While that loads, or if it fails, no chips show, and typing still works.
- **Offline banner:** "You're offline. What you see may be out of date, and nothing can be sent until you're back online." shows above every signed-in page while the browser is offline. When the connection returns, the banner goes, the toast "You're back online." with "Refreshing your details." appears, and what's on screen refetches.
- **CSV export:** Download CSV under an account's history saves the rows on screen, with the filter applied, as `kifiya-<account>-<date>.csv`:
  - Columns: Date (in the user's time zone), Reference, Description, Type, Direction, Amount (ETB, money out negative), Balance after (ETB) and Other account.
  - The file is UTF-8 with a byte order mark so Excel reads it correctly.
  - Text that a spreadsheet would run as a formula gets a leading `'`.

### For demos and development

- **Mock mode** (`NEXT_PUBLIC_API_MOCKING=on`): an in-browser copy of the API with demo users. It keeps its data across reloads ([ADR-0009](decisions/0009-mock-mode.md), [testing.md](testing.md)).
- **Session inspector** (`NEXT_PUBLIC_DEV_TOOLS=on`): a Session button in the corner. It shows when both tokens expire and how often this tab has refreshed. It can expire the access token now, fire three calls at once to watch one refresh serve them all, or expire the refresh token to watch the session end.
- **Component gallery** at `/dev/components` (development only): every UI component in every state.
