import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseEnv } from "./env";

const base = {
  NEXT_PUBLIC_API_BASE_URL: "https://challenge-api.qena.dev",
  NEXT_PUBLIC_API_MOCKING: undefined,
  NEXT_PUBLIC_DEV_TOOLS: undefined,
};

describe("parseEnv", () => {
  it("returns the base URL and turns optional flags off by default", () => {
    expect(parseEnv(base)).toEqual({
      apiBaseUrl: "https://challenge-api.qena.dev",
      apiMocking: false,
      devTools: false,
    });
  });

  it("removes trailing slashes so paths can be appended safely", () => {
    const env = parseEnv({ ...base, NEXT_PUBLIC_API_BASE_URL: "https://challenge-api.qena.dev//" });
    expect(env.apiBaseUrl).toBe("https://challenge-api.qena.dev");
  });

  it("accepts http for local development", () => {
    const env = parseEnv({ ...base, NEXT_PUBLIC_API_BASE_URL: "http://localhost:8080" });
    expect(env.apiBaseUrl).toBe("http://localhost:8080");
  });

  it('turns flags on only for the value "on"', () => {
    const env = parseEnv({ ...base, NEXT_PUBLIC_API_MOCKING: "on", NEXT_PUBLIC_DEV_TOOLS: "off" });
    expect(env.apiMocking).toBe(true);
    expect(env.devTools).toBe(false);
  });

  it("treats empty and whitespace-only values as unset", () => {
    const env = parseEnv({ ...base, NEXT_PUBLIC_API_MOCKING: "", NEXT_PUBLIC_DEV_TOOLS: "  " });
    expect(env.apiMocking).toBe(false);
    expect(env.devTools).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const env = parseEnv({ ...base, NEXT_PUBLIC_API_BASE_URL: "  https://api.test  " });
    expect(env.apiBaseUrl).toBe("https://api.test");
  });

  it("says the base URL is required when it is missing or empty", () => {
    for (const value of [undefined, ""]) {
      expect(() => parseEnv({ ...base, NEXT_PUBLIC_API_BASE_URL: value })).toThrow(
        /is required[\s\S]*NEXT_PUBLIC_API_BASE_URL/,
      );
    }
  });

  it("rejects a base URL that is not http(s)", () => {
    for (const value of ["ftp://challenge-api.qena.dev", "challenge-api.qena.dev", "not a url"]) {
      expect(() => parseEnv({ ...base, NEXT_PUBLIC_API_BASE_URL: value })).toThrow(
        /must be an http\(s\) URL/,
      );
    }
  });

  it('rejects flag values other than "on" or "off"', () => {
    expect(() => parseEnv({ ...base, NEXT_PUBLIC_API_MOCKING: "yes" })).toThrow(
      /must be "on" or "off"[\s\S]*NEXT_PUBLIC_API_MOCKING/,
    );
  });

  it("names the variable and points to .env.example in the error", () => {
    expect(() => parseEnv({ ...base, NEXT_PUBLIC_DEV_TOOLS: "true" })).toThrow(
      /NEXT_PUBLIC_DEV_TOOLS[\s\S]*Copy \.env\.example to \.env\.local/,
    );
  });
});

describe("zod", () => {
  it("runs without eval, which the CSP blocks", () => {
    expect(z.config().jitless).toBe(true);
  });
});
