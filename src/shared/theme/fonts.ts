import { Montserrat, Raleway } from "next/font/google";

// The spec's two families (docs/design/design-tokens.json → typography).
// next/font downloads them at build time and serves them from this app, so there
// is no request to Google at runtime, and it sizes a fallback font to match each
// one, so text doesn't shift when the web font arrives.
// Both are variable fonts, so every weight in the type scale is in one file.

/** Text: body copy, labels, buttons, amounts. Exposed as `var(--font-text)`. */
const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-text",
});

/** Headings and balances. Exposed as `var(--font-display)`. */
const raleway = Raleway({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

/** Class names that define both font variables; set on `<html>`. */
export const fontVariables = `${montserrat.variable} ${raleway.variable}`;
