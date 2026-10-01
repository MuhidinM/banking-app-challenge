import { describe, expect, it } from "vitest";

import {
  type Cents,
  addCents,
  formatAmountInput,
  formatMoney,
  fromCents,
  parseAmountInput,
  subtractCents,
  toCents,
} from "./money";

const cents = (value: number) => value as Cents;

describe("toCents / fromCents", () => {
  it.each([
    [8640, 864_000],
    [1665.5, 166_550],
    [0.29, 29], // 0.29 * 100 is 28.999999999999996 in floating point
    [0.1, 10],
    [8639.7, 863_970],
    [1_000_000_000, 100_000_000_000], // the API's maximum transfer
    [0, 0],
  ])("%d ETB → %d cents", (amount, expected) => {
    expect(toCents(amount)).toBe(expected);
  });

  it("round-trips API amounts", () => {
    for (const amount of [0.01, 0.29, 15, 1665, 8640, 2200.55, 999_999_999.99]) {
      expect(fromCents(toCents(amount))).toBe(amount);
    }
  });

  it("adds and subtracts exactly, unlike floats", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(addCents(toCents(0.1), toCents(0.2))).toBe(30);
    expect(subtractCents(toCents(8640), toCents(250))).toBe(toCents(8390));
    expect(addCents()).toBe(0);
  });
});

describe("parseAmountInput", () => {
  it.each([
    ["250", 25_000],
    ["250.5", 25_050],
    ["250.55", 25_055],
    ["0.29", 29],
    [".5", 50],
    ["1,250.00", 125_000],
    [" 9 000 ", 900_000],
    ["0", 0],
  ])("%j → %d cents", (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it.each(["", ".", "abc", "1.2.3", "250.555", "-5", "1e3"])("rejects %j", (input) => {
    expect(parseAmountInput(input)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats like the spec: currency, thousands separators, two decimals", () => {
    expect(formatMoney(cents(220_000))).toBe("ETB 2,200.00");
    expect(formatMoney(cents(1_084_000))).toBe("ETB 10,840.00");
    expect(formatMoney(cents(0))).toBe("ETB 0.00");
    expect(formatMoney(cents(5))).toBe("ETB 0.05");
    expect(formatMoney(cents(100_000_000_000))).toBe("ETB 1,000,000,000.00");
  });

  it("signs transaction amounts by direction", () => {
    expect(formatMoney(cents(166_500), { sign: "credit" })).toBe("+ETB 1,665.00");
    expect(formatMoney(cents(1_500), { sign: "debit" })).toBe("−ETB 15.00");
  });

  it("signs by value when asked, and always shows negatives", () => {
    expect(formatMoney(cents(-1_500), { sign: true })).toBe("−ETB 15.00");
    expect(formatMoney(cents(1_500), { sign: true })).toBe("+ETB 15.00");
    expect(formatMoney(cents(-1_500))).toBe("−ETB 15.00");
  });

  it("uses a true minus sign (U+2212), which screen readers read as minus", () => {
    expect(formatMoney(cents(1_500), { sign: "debit" }).codePointAt(0)).toBe(0x2212);
  });
});

describe("formatAmountInput", () => {
  it("groups and pads an amount for the field after it loses focus", () => {
    expect(formatAmountInput(cents(900_000))).toBe("9,000.00");
    expect(formatAmountInput(cents(25_050))).toBe("250.50");
  });

  it("round-trips with parseAmountInput", () => {
    for (const value of [1, 29, 25_050, 900_000, 100_000_000_000]) {
      expect(parseAmountInput(formatAmountInput(cents(value)))).toBe(value);
    }
  });
});
