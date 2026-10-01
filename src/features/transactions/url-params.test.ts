import { describe, expect, it } from "vitest";

import { readIdParam } from "./url-params";

describe("readIdParam", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    [null, null],
    ["", null],
    ["0", null],
    ["-1", null],
    ["1.5", null],
    ["abc", null],
    ["99999999999999999999", null],
  ])("%s → %s", (value, expected) => {
    expect(readIdParam(value)).toBe(expected);
  });
});
