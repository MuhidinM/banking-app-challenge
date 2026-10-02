/**
 * The API sends timestamps in UTC **without** an offset, e.g. "2025-06-01T10:30:00.123".
 * `new Date()` reads such a string as *local* time, which in Ethiopia (UTC+3) puts
 * every transaction three hours early and moves late-evening ones to the wrong day.
 * Always go through `parseApiDate` (ADR-0007).
 *
 * Display follows the user's time zone (pass `timeZone` to pin one, as tests do).
 */

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** A Date for an API timestamp, read as UTC when it carries no offset. */
export function parseApiDate(timestamp: string): Date {
  const date = new Date(HAS_OFFSET.test(timestamp) ? timestamp : `${timestamp}Z`);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Not an API timestamp: ${timestamp}`);
  return date;
}

export interface DateOptions {
  /** IANA zone such as "Africa/Addis_Ababa". Defaults to the user's. */
  timeZone?: string | undefined;
}

interface ZonedParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  hour: number;
  minute: number;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Our own names rather than Intl's: newer locale data writes "Sept" for
// September, older "Sep", so browsers would disagree. The spec writes "Sep".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Building an Intl.DateTimeFormat is far slower than using one, and every
// transaction row needs several dates: one formatter per time zone, reused.
// (Profiled: on a throttled phone CPU, rebuilding it was the most expensive
// function on the Activity page, #51.)
const zonedFormatters = new Map<string | undefined, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  let formatter = zonedFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    zonedFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** The date's calendar fields in the zone. Intl does the time-zone conversion; only numbers come out. */
function zonedParts(date: Date, { timeZone }: DateOptions): ZonedParts {
  const parts = zonedFormatter(timeZone).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  const [year, month, day] = [value("year"), value("month"), value("day")];
  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    hour: value("hour"),
    minute: value("minute"),
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** The calendar day in the given zone as "YYYY-MM-DD" (for grouping and comparison). */
export function localDayKey(date: Date, options: DateOptions = {}): string {
  const { year, month, day } = zonedParts(date, options);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Whole calendar days from `date` to `now` in the zone (0 = same day, 1 = yesterday). */
function daysBefore(date: Date, now: Date, options: DateOptions): number {
  const toUtcMidnight = (key: string) => Date.parse(`${key}T00:00:00Z`);
  return Math.round(
    (toUtcMidnight(localDayKey(now, options)) - toUtcMidnight(localDayKey(date, options))) /
      86_400_000,
  );
}

/**
 * A day heading for transaction lists (UI spec): "Today", "Yesterday", or
 * "Sunday, 30 Aug" (with the year when it isn't the current year).
 */
export function dayLabel(date: Date, now: Date = new Date(), options: DateOptions = {}): string {
  const days = daysBefore(date, now, options);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";

  const { year, month, day, weekday } = zonedParts(date, options);
  const sameYear = year === zonedParts(now, options).year;
  return `${WEEKDAYS[weekday]}, ${day} ${MONTHS[month - 1]}${sameYear ? "" : ` ${year}`}`;
}

/** "15:18" (24-hour, as in "Refund · 15:18"). */
export function formatTime(date: Date, options: DateOptions = {}): string {
  const { hour, minute } = zonedParts(date, options);
  return `${pad(hour)}:${pad(minute)}`;
}

/** "Today, 15:18" / "Yesterday, 20:18" / "2 Sep 2026, 23:24" (transaction details, receipts). */
export function formatDateTime(
  date: Date,
  now: Date = new Date(),
  options: DateOptions = {},
): string {
  const days = daysBefore(date, now, options);
  const time = formatTime(date, options);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return formatFullDateTime(date, options);
}

/** "2 Sep 2026, 23:24" always, for text read later, such as a shared receipt. */
export function formatFullDateTime(date: Date, options: DateOptions = {}): string {
  const { year, month, day } = zonedParts(date, options);
  return `${day} ${MONTHS[month - 1]} ${year}, ${formatTime(date, options)}`;
}

export interface DayGroup<T> {
  /** "YYYY-MM-DD" in the display zone; stable React key. */
  key: string;
  label: string;
  items: T[];
}

/**
 * Groups items (already sorted, e.g. newest first as the API returns them) into
 * consecutive local days, keeping their order. Pages loaded later append to the
 * last group when they continue the same day.
 */
export function groupByDay<T>(
  items: readonly T[],
  getDate: (item: T) => Date,
  now: Date = new Date(),
  options: DateOptions = {},
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = getDate(item);
    const key = localDayKey(date, options);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(date, now, options), items: [item] });
  }
  return groups;
}
