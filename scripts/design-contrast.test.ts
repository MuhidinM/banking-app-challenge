import { describe, expect, it } from "vitest";

import { resolvePalette, tokensSchema } from "./generate-tokens.mts";
import tokensJson from "../docs/design/design-tokens.json";

/**
 * WCAG 2.2 contrast of the colour pairs the screens actually use.
 * Text needs 4.5:1 (1.4.3); UI indicators such as the focus ring need 3:1 (1.4.11).
 *
 * The spec says all text meets AA in both themes, but some token pairs do not.
 * By decision these tokens are used as given; the failing pairs are listed in
 * KNOWN_FAILURES and documented in docs/spec-notes.md (N-016). The test pins
 * both lists, so a token change that fixes or breaks a pair shows up here.
 */

const tokens = tokensSchema.parse(tokensJson);
type Palette = ReturnType<typeof resolvePalette>;
type Role = keyof Palette;

function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5]
    .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const TEXT = 4.5;
const INDICATOR = 3;

// [foreground, background, required ratio, where it's used]
const pairs: [Role, Role, number, string][] = [
  ["ink", "surface", TEXT, "body text on cards"],
  ["ink", "surfaceMuted", TEXT, "body text on the page"],
  ["inkMuted", "surface", TEXT, "secondary text, labels"],
  ["inkMuted", "surfaceMuted", TEXT, "secondary text on the page"],
  ["inkSubtle", "surface", TEXT, "placeholders"],
  ["onPrimary", "primary", TEXT, "primary button text"],
  ["primary", "surface", TEXT, "links, outline buttons"],
  ["primary", "primarySoft", TEXT, "soft buttons, active navigation"],
  ["credit", "surface", TEXT, "money-in amounts"],
  ["credit", "creditSoft", TEXT, "money-in badges"],
  ["debit", "surface", TEXT, "money-out amounts, field errors"],
  ["debit", "debitSoft", TEXT, "money-out badges"],
  ["warning", "warningSoft", TEXT, "the irreversible-transfer warning"],
  ["accent", "surface", INDICATOR, "focus ring"],
];

/** Pairs below their required ratio, as `theme fg/bg`. */
const KNOWN_FAILURES = [
  "light inkSubtle/surface",
  "light credit/surface",
  "light credit/creditSoft",
  "light debit/surface",
  "light debit/debitSoft",
  "light warning/warningSoft",
  "light accent/surface",
  "dark primary/surface",
  "dark primary/primarySoft",
];

describe("contrast of the design tokens", () => {
  for (const theme of ["light", "dark"] as const) {
    const palette = resolvePalette(tokens, theme);

    for (const [fg, bg, required, use] of pairs) {
      const id = `${theme} ${fg}/${bg}`;
      const ratio = contrast(palette[fg], palette[bg]);
      const expectation = KNOWN_FAILURES.includes(id) ? "fails (known)" : "passes";

      it(`${id} (${use}) ${expectation} at ${ratio.toFixed(2)}:1`, () => {
        if (KNOWN_FAILURES.includes(id)) expect(ratio).toBeLessThan(required);
        else expect(ratio).toBeGreaterThanOrEqual(required);
      });
    }
  }

  it("white primary-button text passes in dark mode, where the onPrimary token would fail", () => {
    expect(contrast(tokens.color.dark.onPrimary, tokens.color.dark.primary)).toBeLessThan(TEXT);
    expect(
      contrast(resolvePalette(tokens, "dark").onPrimary, tokens.color.dark.primary),
    ).toBeGreaterThan(8);
  });
});
