/**
 * Turns docs/design/design-tokens.json (Kifiya UI spec v3) into:
 * - src/shared/theme/tokens.css: CSS custom properties for both themes plus a
 *   Tailwind v4 `@theme` block, so components use `bg-surface`, `text-ink-muted`,
 *   `rounded-card`, `h-control`… and never hard-coded values
 * - src/shared/theme/token-names.ts: the same names as data, for `cn()`
 *
 *   pnpm tokens          regenerate both files
 *   pnpm tokens:check    fail if a generated file is out of date (used in CI)
 *
 * Runs directly on Node 24 (type stripping), so only erasable TypeScript is used here.
 */
import { readFile, writeFile } from "node:fs/promises";

import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const colorRoles = [
  "primary",
  "primaryHover",
  "primarySoft",
  "accent",
  "accentSoft",
  "surface",
  "surfaceMuted",
  "border",
  "ink",
  "inkMuted",
  "inkSubtle",
  "onPrimary",
  "credit",
  "creditSoft",
  "debit",
  "debitSoft",
  "warning",
  "warningSoft",
] as const;
type ColorRole = (typeof colorRoles)[number];
// Built from the list above; the assertion restores the per-role keys that Object.fromEntries loses.
const palette = z.strictObject(
  Object.fromEntries(colorRoles.map((role) => [role, hex])) as Record<ColorRole, typeof hex>,
);

// `strictObject`: a token added to the JSON fails loudly here instead of being dropped silently.
export const tokensSchema = z.object({
  brand: z.record(z.string(), hex),
  color: z.strictObject({ light: palette, dark: palette }),
  typography: z.object({
    text: z.string(),
    display: z.string(),
    scale: z.array(
      z.object({
        name: z.string(),
        size: z.number(),
        weight: z.number(),
        lineHeight: z.number(),
        family: z.string(),
      }),
    ),
  }),
  radius: z.strictObject({
    card: z.number(),
    control: z.number(),
    button: z.number(),
    pill: z.number(),
  }),
  shadow: z.strictObject({ card: z.string(), float: z.string() }),
  spacing: z.strictObject({
    grid: z.literal(4),
    pagePaddingMobile: z.number(),
    cardPadding: z.number(),
    rowPadding: z.string().regex(/^\d+px \d+px$/),
    sectionGap: z.number(),
    relatedGap: z.number(),
  }),
  sizes: z.strictObject({
    control: z.number(),
    compactControl: z.number(),
    button: z.number(),
    compactButton: z.number(),
    minHitTarget: z.number(),
    rowMinHeight: z.number(),
    icon: z.number(),
    disc: z.number(),
    sidebarWidth: z.number(),
    contentMaxWidth: z.number(),
  }),
  gradient: z.strictObject({ light: z.string(), dark: z.string() }),
});

export type DesignTokens = z.infer<typeof tokensSchema>;
type Theme = "light" | "dark";
type Palette = DesignTokens["color"]["light"];

/**
 * Deliberate deviations from the token file. Each one is listed in
 * docs/spec-notes.md with its reason; nothing else is changed.
 */
export const overrides: Record<Theme, Partial<Palette>> = {
  light: {},
  // N-001: the token is #10202a (contrast 1.99:1 on #0f5565), but the dark
  // screens show white text on primary (8.37:1), and the spec says "text on
  // primary is always white".
  dark: { onPrimary: "#ffffff" },
};

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
/** px → rem, so sizes and text follow the user's browser font-size setting. */
const rem = (px: number) => `${+(px / 16).toFixed(4)}rem`;

export function resolvePalette(tokens: DesignTokens, theme: Theme): Palette {
  return { ...tokens.color[theme], ...overrides[theme] };
}

function themeVariables(tokens: DesignTokens, theme: Theme, indent: string): string[] {
  const colors = Object.entries(resolvePalette(tokens, theme)).map(
    ([role, value]) => `${indent}--kb-color-${kebab(role)}: ${value.toLowerCase()};`,
  );
  return [
    `${indent}color-scheme: ${theme};`,
    ...colors,
    `${indent}--kb-gradient-balance: ${tokens.gradient[theme]};`,
  ];
}

/** Spacing and size utilities (`p-card`, `h-control`…) as [name, px], shared by both outputs. */
function spacingScale(tokens: DesignTokens): {
  spacing: [string, number][];
  sizes: [string, number][];
} {
  const [rowY = 0, rowX = 0] = tokens.spacing.rowPadding
    .split(" ")
    .map((value) => Number.parseInt(value));
  return {
    spacing: [
      ["page", tokens.spacing.pagePaddingMobile],
      ["card", tokens.spacing.cardPadding],
      ["row-y", rowY],
      ["row-x", rowX],
      ["section", tokens.spacing.sectionGap],
      ["related", tokens.spacing.relatedGap],
    ],
    sizes: [
      ["control", tokens.sizes.control],
      ["control-compact", tokens.sizes.compactControl],
      ["button", tokens.sizes.button],
      ["button-compact", tokens.sizes.compactButton],
      ["hit", tokens.sizes.minHitTarget],
      ["row", tokens.sizes.rowMinHeight],
      ["icon", tokens.sizes.icon],
      ["disc", tokens.sizes.disc],
      ["sidebar", tokens.sizes.sidebarWidth],
    ],
  };
}

export function renderTokensCss(tokens: DesignTokens): string {
  const { spacing, sizes } = spacingScale(tokens);
  const familyVar = (family: string) =>
    family === tokens.typography.display ? "var(--font-display)" : "var(--font-text)";

  const lines = [
    "/*",
    " * GENERATED FILE: do not edit. Source: docs/design/design-tokens.json",
    " * Regenerate with `pnpm tokens`; CI fails if this file is out of date.",
    " */",
    "",
    "/* Light theme (default). */",
    ":root {",
    ...themeVariables(tokens, "light", "  "),
    "}",
    "",
    "/* Dark theme: when chosen explicitly, or when the OS prefers dark and light isn't forced. */",
    ':root[data-theme="dark"] {',
    ...themeVariables(tokens, "dark", "  "),
    "}",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    ...themeVariables(tokens, "dark", "    "),
    "  }",
    "}",
    "",
    "/* Tailwind utilities backed by the variables above. */",
    "@theme inline {",
    "  /* Only design-token colours: Tailwind's default palette is removed. */",
    "  --color-*: initial;",
    ...colorRoles.map((role) => `  --color-${kebab(role)}: var(--kb-color-${kebab(role)});`),
    ...Object.entries(tokens.brand).map(
      ([name, value]) => `  --color-brand-${kebab(name)}: ${value.toLowerCase()};`,
    ),
    "",
    ...tokens.typography.scale.flatMap((step) => [
      `  --text-${kebab(step.name)}: ${rem(step.size)};`,
      `  --text-${kebab(step.name)}--line-height: ${step.lineHeight};`,
      `  --text-${kebab(step.name)}--font-weight: ${step.weight};`,
    ]),
    "",
    ...Object.entries(tokens.radius).map(([name, px]) => `  --radius-${kebab(name)}: ${px}px;`),
    ...Object.entries(tokens.shadow).map(([name, value]) => `  --shadow-${kebab(name)}: ${value};`),
    "",
    "  /* Spacing (the 4px grid is Tailwind's default step: p-1 = 4px). */",
    ...spacing.map(([name, px]) => `  --spacing-${name}: ${rem(px)};`),
    "",
    "  /* Sizes: h-control, h-button-compact, min-h-row, size-icon, w-sidebar, max-w-content… */",
    ...sizes.map(([name, px]) => `  --spacing-${name}: ${rem(px)};`),
    `  --container-content: ${rem(tokens.sizes.contentMaxWidth)};`,
    "}",
    "",
    "/* Balance card background, e.g. `bg-balance`. */",
    "@utility bg-balance {",
    "  background-image: var(--kb-gradient-balance);",
    "}",
    "",
    "/* The spec's type styles in one class each, including the family: `type-heading`… */",
    ...tokens.typography.scale.flatMap((step) => [
      `@utility type-${kebab(step.name)} {`,
      `  font-family: ${familyVar(step.family)};`,
      `  font-size: var(--text-${kebab(step.name)});`,
      `  line-height: var(--text-${kebab(step.name)}--line-height);`,
      `  font-weight: var(--text-${kebab(step.name)}--font-weight);`,
      "}",
    ]),
    "",
  ];
  return lines.join("\n");
}

/**
 * The token names behind each utility family, for code that has to understand
 * class names, such as `cn()` deciding that `text-title` (a size) and `text-ink`
 * (a colour) don't conflict.
 */
export function renderTokenNamesTs(tokens: DesignTokens): string {
  const { spacing, sizes } = spacingScale(tokens);
  const names = {
    color: [
      ...colorRoles.map(kebab),
      ...Object.keys(tokens.brand).map((name) => `brand-${kebab(name)}`),
    ],
    text: tokens.typography.scale.map((step) => kebab(step.name)),
    spacing: [...spacing, ...sizes].map(([name]) => name),
    radius: Object.keys(tokens.radius).map(kebab),
    shadow: Object.keys(tokens.shadow).map(kebab),
    container: ["content"],
  };
  return [
    "// GENERATED FILE: do not edit. Source: docs/design/design-tokens.json",
    "// Regenerate with `pnpm tokens`; CI fails if this file is out of date.",
    "",
    `export const tokenNames = ${JSON.stringify(names, null, 2)} as const;`,
    "",
  ].join("\n");
}

const source = new URL("../docs/design/design-tokens.json", import.meta.url);
const outputs = [
  { file: "src/shared/theme/tokens.css", render: renderTokensCss },
  { file: "src/shared/theme/token-names.ts", render: renderTokenNamesTs },
];

async function main(check: boolean): Promise<void> {
  const tokens = tokensSchema.parse(JSON.parse(await readFile(source, "utf8")));

  let stale = false;
  for (const { file, render } of outputs) {
    const target = new URL(`../${file}`, import.meta.url);
    const content = render(tokens);
    if (check) {
      const current = await readFile(target, "utf8").catch(() => "");
      if (current !== content) {
        console.error(`${file} is out of date. Run \`pnpm tokens\`.`);
        stale = true;
      }
    } else {
      await writeFile(target, content);
      console.log(`Wrote ${file}`);
    }
  }

  if (stale) process.exit(1);
  if (check) console.log("Generated token files are up to date.");
}

if (import.meta.main) await main(process.argv.includes("--check"));
