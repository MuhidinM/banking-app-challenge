import type { CSSProperties } from "react";

/**
 * The inline style for the `amount-fit` utility (src/shared/theme/base.css):
 * how many characters the amount has, so it can shrink to fit its container.
 */
export function fitAmountStyle(text: string): CSSProperties {
  return { "--amount-chars": Math.max(text.length, 1) } as CSSProperties;
}
