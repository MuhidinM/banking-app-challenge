import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins cells with commas and rows with CRLF", () => {
    expect(
      toCsv([
        ["Date", "Amount"],
        ["2026-09-30", 12.5],
      ]),
    ).toBe("Date,Amount\r\n2026-09-30,12.5\r\n");
  });

  it("quotes cells with commas, quotes or line breaks", () => {
    expect(toCsv([['Rent, "September"', "two\nlines"]])).toBe(
      '"Rent, ""September""","two\nlines"\r\n',
    );
  });

  it("leaves empty cells empty", () => {
    expect(toCsv([["a", null, undefined, ""]])).toBe("a,,,\r\n");
  });

  it("keeps text that looks like a formula from running in a spreadsheet", () => {
    expect(toCsv([['=HYPERLINK("x")', "+1", "-2", "@SUM(A1)"]])).toBe(
      `"'=HYPERLINK(""x"")",'+1,'-2,'@SUM(A1)\r\n`,
    );
  });

  it("writes negative numbers as numbers", () => {
    expect(toCsv([[-15]])).toBe("-15\r\n");
  });
});
