# ADR-0006 · Generate CSS variables from design-tokens.json

**Status:** accepted · 2026-10-01

## Context
The brief: "Map it to CSS custom properties (or your theme object) rather than retyping values."

## Decision
`scripts/generate-tokens.ts` reads `docs/design/design-tokens.json` and writes `src/shared/theme/tokens.css`: light values on `:root`, dark values on `[data-theme="dark"]`, plus a Tailwind v4 `@theme` block mapping utilities (`bg-surface`, `text-ink-muted`, `rounded-card`, `shadow-card`…) to the variables. CI fails if the generated file is out of date.

Theme choice `system | light | dark` is stored in `localStorage`; a tiny inline script in `<head>` sets `data-theme` before first paint.

## Consequences
- One source of truth; a token change is one regenerate.
- No hard-coded hex values in components (checked in review and by grep in CI).
