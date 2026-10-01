import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { tokenNames } from "@/shared/theme/token-names";

/**
 * tailwind-merge only knows Tailwind's default theme. Without these names it
 * would read `text-title` (a font size) as a colour and drop it next to
 * `text-ink`, and keep both `h-control h-button` instead of the last one.
 * The names are generated from the design tokens, so they can't drift.
 */
const twMerge = extendTailwindMerge<"type-style">({
  extend: {
    theme: {
      color: [...tokenNames.color],
      text: [...tokenNames.text],
      spacing: [...tokenNames.spacing],
      radius: [...tokenNames.radius],
      shadow: [...tokenNames.shadow],
      container: [...tokenNames.container],
    },
    classGroups: {
      // Our `type-*` utilities set family, size, line height and weight in one class.
      "type-style": [{ type: [...tokenNames.text] }],
    },
    conflictingClassGroups: {
      "type-style": ["font-family", "font-size", "leading", "font-weight"],
    },
  },
});

/**
 * Joins class names (strings, arrays, `{ class: condition }` objects) and
 * resolves Tailwind conflicts so the last one wins: `cn("px-4", compact && "px-0")`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
