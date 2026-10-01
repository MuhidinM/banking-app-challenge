import { describe, expect, it } from "vitest";

import {
  dayLabel,
  formatDateTime,
  formatFullDateTime,
  formatTime,
  groupByDay,
  localDayKey,
  parseApiDate,
} from "./dates";

// Ethiopia: UTC+3 all year (no daylight saving).
const addis = { timeZone: "Africa/Addis_Ababa" };
// "Now" in the tests: Thursday 1 Oct 2026, 10:00 in Addis Ababa.
const now = new Date("2026-10-01T07:00:00Z");

describe("parseApiDate", () => {
  it("reads API timestamps, which have no offset, as UTC", () => {
    expect(parseApiDate("2025-06-01T10:30:00.123").toISOString()).toBe("2025-06-01T10:30:00.123Z");
    expect(parseApiDate("2025-06-01T10:30:00").toISOString()).toBe("2025-06-01T10:30:00.000Z");
  });

  it("is not fooled by the machine's time zone, unlike new Date()", () => {
    // new Date() would read this as local time; parseApiDate never does.
    const parsed = parseApiDate("2025-06-01T10:30:00");
    expect(parsed.getTime()).toBe(Date.UTC(2025, 5, 1, 10, 30));
  });

  it("accepts the API's nanosecond fractions", () => {
    expect(parseApiDate("2026-10-01T08:41:33.689744996").toISOString()).toBe(
      "2026-10-01T08:41:33.689Z",
    );
  });

  it("keeps an explicit offset when one is present", () => {
    expect(parseApiDate("2025-06-01T10:30:00Z").toISOString()).toBe("2025-06-01T10:30:00.000Z");
    expect(parseApiDate("2025-06-01T13:30:00+03:00").toISOString()).toBe(
      "2025-06-01T10:30:00.000Z",
    );
  });

  it("throws on something that isn't a timestamp", () => {
    expect(() => parseApiDate("yesterday")).toThrow(RangeError);
  });
});

describe("day labels and the midnight boundary", () => {
  it("puts 22:30 UTC on 30 Sep under Today on 1 Oct, because it is 01:30 in Addis Ababa", () => {
    const lateUtc = parseApiDate("2026-09-30T22:30:00");
    expect(localDayKey(lateUtc, addis)).toBe("2026-10-01");
    expect(dayLabel(lateUtc, now, addis)).toBe("Today");
    // A UTC calendar would have said 30 September, i.e. Yesterday.
    expect(localDayKey(lateUtc, { timeZone: "UTC" })).toBe("2026-09-30");
  });

  it("keeps 23:30 local on 30 Sep (20:30 UTC) under Yesterday", () => {
    const lateLocal = parseApiDate("2026-09-30T20:30:00");
    expect(formatTime(lateLocal, addis)).toBe("23:30");
    expect(dayLabel(lateLocal, now, addis)).toBe("Yesterday");
  });

  it("names older days like the spec: weekday, day and short month", () => {
    expect(dayLabel(parseApiDate("2026-08-30T09:00:00"), now, addis)).toBe("Sunday, 30 Aug");
  });

  it('writes September as "Sep" in every browser (locale data varies between "Sep" and "Sept")', () => {
    expect(dayLabel(parseApiDate("2026-09-02T09:00:00"), now, addis)).toBe("Wednesday, 2 Sep");
  });

  it("adds the year for days in another year", () => {
    expect(dayLabel(parseApiDate("2025-12-31T09:00:00"), now, addis)).toBe(
      "Wednesday, 31 Dec 2025",
    );
  });
});

describe("formatTime and formatDateTime", () => {
  it("uses 24-hour time in the display zone", () => {
    const refund = parseApiDate("2026-10-01T12:18:00");
    expect(formatTime(refund, addis)).toBe("15:18");
    expect(formatDateTime(refund, now, addis)).toBe("Today, 15:18");
  });

  it("writes older dates like the receipt: 2 Sep 2026, 23:24", () => {
    expect(formatDateTime(parseApiDate("2026-09-02T20:24:00"), now, addis)).toBe(
      "2 Sep 2026, 23:24",
    );
  });

  it("says Yesterday for yesterday", () => {
    expect(formatDateTime(parseApiDate("2026-09-30T17:18:00"), now, addis)).toBe(
      "Yesterday, 20:18",
    );
  });

  it("writes the full date even for today when asked (shared receipts)", () => {
    expect(formatFullDateTime(parseApiDate("2026-10-01T12:18:00"), addis)).toBe(
      "1 Oct 2026, 15:18",
    );
  });
});

describe("groupByDay", () => {
  const rows = [
    { id: 5, timestamp: "2026-10-01T06:00:00" }, // 09:00 today
    { id: 4, timestamp: "2026-09-30T22:30:00" }, // 01:30 today
    { id: 3, timestamp: "2026-09-30T20:30:00" }, // 23:30 yesterday
    { id: 2, timestamp: "2026-09-30T05:00:00" }, // 08:00 yesterday
    { id: 1, timestamp: "2026-08-30T09:00:00" }, // Sunday, 30 Aug
  ];

  it("groups newest-first rows into local days, keeping their order", () => {
    const groups = groupByDay(rows, (row) => parseApiDate(row.timestamp), now, addis);
    expect(groups.map((group) => [group.label, group.items.map((row) => row.id)])).toEqual([
      ["Today", [5, 4]],
      ["Yesterday", [3, 2]],
      ["Sunday, 30 Aug", [1]],
    ]);
    expect(groups.map((group) => group.key)).toEqual(["2026-10-01", "2026-09-30", "2026-08-30"]);
  });

  it("returns no groups for no rows", () => {
    expect(groupByDay([], () => now, now, addis)).toEqual([]);
  });
});
