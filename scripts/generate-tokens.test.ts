import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  overrides,
  renderTokenNamesTs,
  renderTokensCss,
  resolvePalette,
  tokensSchema,
} from "./generate-tokens.mts";
import tokensJson from "../docs/design/design-tokens.json";

const tokens = tokensSchema.parse(tokensJson);
const css = renderTokensCss(tokens);

describe("design token generator", () => {
  it("accepts the Kifiya token file", () => {
    expect(() => tokensSchema.parse(tokensJson)).not.toThrow();
  });

  it("rejects a token it doesn't know, instead of silently dropping it", () => {
    const changed = { ...tokensJson, radius: { ...tokensJson.radius, badge: 8 } };
    expect(() => tokensSchema.parse(changed)).toThrow();
  });

  it("emits every colour role for both themes and as a Tailwind colour", () => {
    for (const role of Object.keys(tokens.color.light)) {
      const name = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      // Light, dark (explicit) and dark (OS preference) blocks.
      expect(css.match(new RegExp(`--kb-color-${name}:`, "g"))).toHaveLength(3);
      expect(css).toContain(`--color-${name}: var(--kb-color-${name});`);
    }
  });

  it("uses the token values, with only the documented overrides", () => {
    expect(resolvePalette(tokens, "light")).toEqual(tokens.color.light);
    expect(overrides.light).toEqual({});
    expect(overrides.dark).toEqual({ onPrimary: "#ffffff" });
    expect(resolvePalette(tokens, "dark")).toEqual({ ...tokens.color.dark, onPrimary: "#ffffff" });
  });

  it("follows the OS preference unless the user forces a theme", () => {
    expect(css).toContain(':root[data-theme="dark"] {');
    expect(css).toContain(
      '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {',
    );
  });

  it("removes Tailwind's default palette so only token colours exist", () => {
    expect(css).toContain("--color-*: initial;");
  });

  it("converts sizes and type to rem so they follow the browser's font size", () => {
    expect(css).toContain("--spacing-control: 3.25rem;"); // 52px
    expect(css).toContain("--spacing-sidebar: 16.25rem;"); // 260px
    expect(css).toContain("--text-caption: 0.75rem;"); // 12px
    expect(css).toContain("--container-content: 64rem;"); // 1024px
  });

  it("gives each type style its family: Raleway for headings, Montserrat for text", () => {
    expect(css).toMatch(/@utility type-heading \{\n {2}font-family: var\(--font-display\);/);
    expect(css).toMatch(/@utility type-body \{\n {2}font-family: var\(--font-text\);/);
  });

  it("matches the committed tokens.css", async () => {
    // Tests run in jsdom, where import.meta.url is not a file URL; paths are from the repo root.
    const committed = await readFile("src/shared/theme/tokens.css", "utf8");
    expect(committed).toBe(css);
  });

  it("lists the same names in token-names.ts as utilities in tokens.css", async () => {
    const committed = await readFile("src/shared/theme/token-names.ts", "utf8");
    expect(committed).toBe(renderTokenNamesTs(tokens));
    for (const name of ["control", "button-compact", "row-y", "sidebar"]) {
      expect(css).toContain(`--spacing-${name}:`);
      expect(committed).toContain(`"${name}"`);
    }
  });
});
