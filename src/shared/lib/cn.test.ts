import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins strings, arrays and conditional objects, skipping falsy values", () => {
    expect(cn("a", ["b", false && "c"], { d: true, e: false }, undefined, null)).toBe("a b d");
  });

  it("lets the last class win for the same property", () => {
    expect(cn("px-4", "px-0")).toBe("px-0");
    expect(cn("bg-surface", "bg-primary")).toBe("bg-primary");
  });

  it("keeps a token font size and a token colour together", () => {
    // Without the token names, tailwind-merge drops text-title here.
    expect(cn("text-title", "text-ink")).toBe("text-title text-ink");
    expect(cn("text-ink", "text-ink-muted")).toBe("text-ink-muted");
    expect(cn("text-body", "text-caption")).toBe("text-caption");
  });

  it("merges token sizes, radii and shadows", () => {
    expect(cn("h-control", "h-button-compact")).toBe("h-button-compact");
    expect(cn("rounded-card", "rounded-pill")).toBe("rounded-pill");
    expect(cn("shadow-card", "shadow-float")).toBe("shadow-float");
    expect(cn("p-card", "p-page")).toBe("p-page");
    expect(cn("max-w-content", "max-w-sidebar")).toBe("max-w-sidebar");
  });

  it("treats type-* as one style that replaces size, weight and family classes", () => {
    expect(cn("type-body", "type-label")).toBe("type-label");
    expect(cn("text-caption font-medium", "type-heading")).toBe("type-heading");
    expect(cn("type-heading", "text-ink")).toBe("type-heading text-ink");
  });
});
