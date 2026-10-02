# Accessibility

The target is WCAG 2.2 level AA, on a keyboard, with a screen reader, on a phone and with reduced motion. One known exception is colour contrast: some of the design's own colour tokens fall short, and they are used as given by decision ([Contrast](#contrast)).

## How it is checked

| Check                             | Where                                                               | What it covers                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| axe (WCAG 2.0–2.2 A and AA rules) | [`accessibility.spec.ts`](../e2e/accessibility.spec.ts)             | `/login` and `/register`, then ten signed-in pages including both receipts, plus the transaction details dialog and the transfer review. Light and dark, 1440 px and 375 px. Colour contrast is left to the next row |
| Contrast of every token pair      | [`design-contrast.test.ts`](../scripts/design-contrast.test.ts)     | Measures each text, icon and focus colour against its background in both themes, and pins which pairs pass and fail, so a token change can't slip by                                                                 |
| Keyboard only                     | [`keyboard-and-motion.spec.ts`](../e2e/keyboard-and-motion.spec.ts) | Every tab stop shows a focus indicator (login and six signed-in pages). Four whole tasks without a mouse: login → transfer → receipt → logout, paying a bill, opening an account, the history                        |
| Reduced motion                    | same file                                                           | The details dialog animates without reduced motion and doesn't with it                                                                                                                                               |
| Reflow and tap size               | [`responsive.spec.ts`](../e2e/responsive.spec.ts)                   | 360 to 1440 px with extreme values: no sideways scroll, nothing cut off at the right edge, every tap area at least 44 × 44 px                                                                                        |
| Roles and names                   | component tests                                                     | Tests find elements the way assistive technology does (`getByRole`, `getByLabelText`), so an unlabelled control fails its test                                                                                       |
| Screen reader                     | by hand                                                             | The project owner checked forms, errors and toasts with NVDA (#46)                                                                                                                                                   |
| Lighthouse accessibility          | [performance.md](performance.md)                                    | 96–100 on every page; the only finding is the contrast exception below                                                                                                                                               |

## Page structure

- **Language:** `lang="en"` on the document.
- **Titles:** every page has its own title, such as "Transfer", "Bill receipt" or "Page not found". Next.js's route announcer reads it out after each client-side navigation.
- **Landmarks:** the sidebar and the bottom bar are `nav` elements named "Main". The dashboard's shortcuts are a `nav` named "Quick actions", and each page's content is in `main`.
- **One `h1` per page,** then section headings. Under the account page's "Activity" heading, the day headings in the history step down to `h3`.
- **Skip link:** "Skip to content" is the first tab stop on every signed-in page ([`app-shell.tsx`](../src/shared/layout/app-shell.tsx)). It stays out of sight until focused and jumps past the navigation.
- **Focus after navigation** ([`route-focus.tsx`](../src/shared/layout/route-focus.tsx)): after a client-side navigation, focus moves to the new page's heading. Otherwise it would stay on the link that was clicked, in a sidebar that didn't change. Some pages draw their heading only once their data arrives, such as a receipt. There, focus waits on `main` and moves to the heading when it appears, unless the user has moved focus elsewhere first. The first page load is left alone.

## Keyboard

- **Visible focus**, from the spec ([`base.css`](../src/shared/theme/base.css)):
  - Buttons and links get a 2 px accent outline offset by 2 px.
  - Fields get an accent border and a 3 px soft accent ring around the whole frame, so a leading icon or the "ETB" prefix sits inside it.
  - Rings show for keyboard focus only (`:focus-visible`), not mouse clicks.
- **Native and Radix controls:** buttons, links and native radio buttons (account type, filter pills, theme) behave as the platform does. Arrow keys move within a radio group.
  - Select (account and biller pickers): Enter or Space opens, arrows move, Enter chooses, Escape closes.
  - Dialog and sheet: focus is trapped inside, Escape closes, and focus returns to what opened it.
  - Toast: F8 jumps to the notification region.
- **Forms:** submitting with errors moves focus to the first field in error. An error from the API goes back on its field with focus there, for example "Account not found." on the recipient.
- **Load more** keeps focus on the button while rows are added below, so the list never jumps. After the last page the button goes away, and focus moves to "Showing x of y" instead of being lost.
- **Transaction rows** are buttons that open the details. Closing the details returns focus to the row, or to the page heading if the row is no longer there (another filter, say).

## Screen readers

- **Labelled fields** ([`form-field.tsx`](../src/shared/ui/form-field.tsx)):
  - Every field has a visible label tied to it.
  - Its hint, or its error once there is one, is linked with `aria-describedby`, and an invalid field has `aria-invalid`.
  - The error area is a polite live region, so a new error is read out without moving focus.
- **Live regions:**
  - Toasts: assertive for errors, polite for the rest (Radix).
  - The offline banner: a status region that is always present, so it is announced when it fills.
  - "Showing x of y" in the history.
  - A failed Load more is announced as an alert.
  - Error states that replace a loading state are alerts too.
- **Loading** ([`skeleton.tsx`](../src/shared/ui/skeleton.tsx)): skeletons sit in a status region with `aria-busy` and a name such as "Loading transactions". The region is announced and the grey blocks stay silent.
- **Buttons that show a spinner** set `aria-busy` and ignore further clicks.
- **One sentence per transaction row:** each row is read as a whole, for example "Refund from merchant. Money in, ETB 1,665.00. Refund, Today, 15:18." It isn't read as a series of fragments.
- **Money never rests on colour alone:**
  - Amounts carry a sign: "+ETB" or "−ETB".
  - Rows and details say "Money in" or "Money out".
  - The filter pills use words and an icon.
- **Hidden balance:** with the eye button on, the amount is replaced by "ETB ******", hidden from screen readers, and read as "Hidden". The button says "Hide balance" and reports its state with `aria-pressed`.
- **Icon-only buttons have names:** for example "Copy account number", "Share account number", "Dismiss notification", the back buttons ("Back to …") and "Your profile".
- **Decorative icons** are `aria-hidden`.

## Visual

- **Tap targets:** every control is at least 44 × 44 px ([N-019](spec-notes.md)). Where the design draws a smaller control, such as a copy icon, the `hit-area` utility adds an invisible 44 px box around it without changing how it looks. The quick-amount chips are drawn about 36 px high and built 44 px high.
- **Reflow and zoom:**
  - Layouts work from 360 px without sideways scrolling.
  - Very large amounts shrink to fit their space instead of overflowing ([N-035](spec-notes.md)).
  - Long names, notes and biller names wrap instead of being cut off; where text is shortened with an ellipsis, the full text is in the details.
- **Text size:** the smallest text is 12 px (captions and hints), the spec's minimum. Sizes are in `rem`, so browser zoom and font-size settings apply.
- **Dark mode:** both themes are generated from the design tokens. The theme follows the operating system, and can be set to light or dark on the profile page.

### Contrast

Measured by [`design-contrast.test.ts`](../scripts/design-contrast.test.ts). Body text, headings and muted text pass AA in both themes. Some pairs from the design's own tokens don't ([N-016](spec-notes.md)):

| Theme | Pair                                             | Ratio | AA needs |
| ----- | ------------------------------------------------ | ----: | -------: |
| Light | Money in, on white                               |  3.49 |      4.5 |
| Light | Money in, on its badge                           |  3.12 |      4.5 |
| Light | Money out, on white                              |  4.28 |      4.5 |
| Light | Money out, on its badge                          |  3.74 |      4.5 |
| Light | Warning banner text                              |  3.54 |      4.5 |
| Light | Placeholder text                                 |  3.83 |      4.5 |
| Light | Focus ring (accent on white)                     |  2.80 |        3 |
| Dark  | Links and outline buttons (`primary` on surface) |  1.99 |      4.5 |
| Dark  | Links on the page background                     |  2.21 |      4.5 |
| Dark  | `primary` on `primarySoft`                       |  1.50 |      4.5 |

**Why they're kept:** the decision was to use the tokens exactly as the design gives them. The one override is white text on primary in dark mode ([N-001](spec-notes.md)).

**What softens the gap:**

- Money in and out never depend on colour alone.
- Placeholders are examples, never the only label.
- The focus ring is paired with a change of border on fields.

**What would close it:** nearest light shades that pass are recorded in N-016: money in `#197f45`, money out `#c33d23`, warning `#9e5b0e`.

## Motion

- With `prefers-reduced-motion: reduce`, dialogs, sheets, toasts and the skeleton pulse don't move. Their animations only run under Tailwind's `motion-safe:`. An earlier `motion-reduce:` override lost on CSS specificity, which is why the e2e test reads the computed animation.
- Spinners keep turning: they are the only sign that something is happening, and WCAG exempts essential motion ([N-032](spec-notes.md)).
- Nothing moves on its own or flashes. Toasts stay while hovered or focused.

## Known gaps

- **Contrast:** the pairs above.
- **Swipe-to-close sheets:** the grab handle on phone sheets is decorative. Sheets close with their Close button, Escape or a tap on the backdrop ([N-021](spec-notes.md)).
- **Assistive technology coverage:** the manual check was NVDA on Windows. VoiceOver on iOS and macOS, and TalkBack, have not been checked by hand.
