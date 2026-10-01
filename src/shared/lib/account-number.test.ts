import { describe, expect, it } from "vitest";

import {
  formatAccountNumber,
  isValidAccountNumber,
  maskAccountNumber,
  normalizeAccountNumber,
} from "./account-number";

describe("account numbers", () => {
  it("accepts exactly 10 digits, with or without the display spaces", () => {
    expect(isValidAccountNumber("2899010846")).toBe(true);
    expect(isValidAccountNumber("2899 0108 46")).toBe(true);
    expect(isValidAccountNumber("0012345678")).toBe(true); // leading zeros are real digits
  });

  it.each(["", "289901084", "28990108461", "2899O10846", "abc"])("rejects %j", (input) => {
    expect(isValidAccountNumber(input)).toBe(false);
  });

  it("keeps only digits", () => {
    expect(normalizeAccountNumber(" 2899-0108 46 ")).toBe("2899010846");
  });

  it("groups as 4-4-2 like the spec, also while typing", () => {
    expect(formatAccountNumber("8751138057")).toBe("8751 1380 57");
    expect(formatAccountNumber("2899")).toBe("2899");
    expect(formatAccountNumber("289901")).toBe("2899 01");
    expect(formatAccountNumber("2899 0108 46 99")).toBe("2899 0108 46"); // stops at 10 digits
  });

  it("masks to the last four digits", () => {
    expect(maskAccountNumber("8751138057")).toBe("•••• 8057");
  });
});
