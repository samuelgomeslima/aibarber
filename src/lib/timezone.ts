const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const WEEKDAY_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const key = timeZone || DEFAULT_TIMEZONE;
  let formatter = FORMATTER_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: key,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    FORMATTER_CACHE.set(key, formatter);
  }
  return formatter;
}

function getWeekdayFormatter(timeZone: string): Intl.DateTimeFormat {
  const key = timeZone || DEFAULT_TIMEZONE;
  let formatter = WEEKDAY_FORMATTER_CACHE.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: key,
      weekday: "short",
    });
    WEEKDAY_FORMATTER_CACHE.set(key, formatter);
  }
  return formatter;
}

function parseDateKey(dateKey: string): [number, number, number] {
  const [yearStr, monthStr, dayStr] = (dateKey ?? "").split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  return [year, month, day];
}

function formatDateKeyFromUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function createUtcDate(parts: ZonedDateParts): Date {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0));
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = getFormatter(timeZone);
  const formattedParts = formatter.formatToParts(date);
  const pick = (type: string) => formattedParts.find((part) => part.type === type)?.value ?? "0";
  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
    second: Number(pick("second")),
  };
}

function resolveZonedDateTime(parts: ZonedDateParts, timeZone: string): Date {
  const utcGuess = createUtcDate(parts);
  const guessParts = getZonedDateParts(utcGuess, timeZone);
  const guessUtc = createUtcDate(guessParts).getTime();
  const targetUtc = utcGuess.getTime() - (guessUtc - utcGuess.getTime());
  return new Date(targetUtc);
}

export function getCurrentZonedDate(timeZone: string = DEFAULT_TIMEZONE): Date {
  const nowParts = getZonedDateParts(new Date(), timeZone);
  return resolveZonedDateTime(nowParts, timeZone);
}

export function formatDateKey(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function getCurrentDateKey(timeZone: string = DEFAULT_TIMEZONE): string {
  return formatDateKey(new Date(), timeZone);
}

export function getDateFromKey(dateKey: string, timeZone: string = DEFAULT_TIMEZONE): Date {
  const [year, month, day] = parseDateKey(dateKey);
  const parts: ZonedDateParts = { year, month, day, hour: 0, minute: 0, second: 0 };
  return resolveZonedDateTime(parts, timeZone);
}

export function addDaysToDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = parseDateKey(dateKey);
  const base = new Date(Date.UTC(year, month - 1, day + amount));
  return formatDateKeyFromUtc(base);
}

export function differenceInDays(startKey: string, endKey: string): number {
  const [sYear, sMonth, sDay] = parseDateKey(startKey);
  const [eYear, eMonth, eDay] = parseDateKey(endKey);
  const start = Date.UTC(sYear, sMonth - 1, sDay, 0, 0, 0);
  const end = Date.UTC(eYear, eMonth - 1, eDay, 0, 0, 0);
  return Math.round((end - start) / DAY);
}

export function getWeekdayIndex(dateKey: string, timeZone: string = DEFAULT_TIMEZONE): number {
  const date = getDateFromKey(dateKey, timeZone);
  const formatter = getWeekdayFormatter(timeZone);
  const label = formatter.format(date).toLowerCase().slice(0, 3);
  return WEEKDAY_INDEX[label] ?? 0;
}

export function getWeekStartDateKey(dateKey: string, timeZone: string = DEFAULT_TIMEZONE): string {
  const weekday = getWeekdayIndex(dateKey, timeZone);
  const diff = (weekday + 6) % 7;
  return addDaysToDateKey(dateKey, -diff);
}

export function getWeekDateKeys(dateKey: string, timeZone: string = DEFAULT_TIMEZONE): string[] {
  const startKey = getWeekStartDateKey(dateKey, timeZone);
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(startKey, index));
}

export function makeZonedDateTime(
  dateKey: string,
  time: string,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  const [year, month, day] = parseDateKey(dateKey);
  const [hourStr = "0", minuteStr = "0", secondStr = "0"] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);
  const parts: ZonedDateParts = { year, month, day, hour, minute, second };
  return resolveZonedDateTime(parts, timeZone);
}

export function formatDateLabel(
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
  locale: string | undefined,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const date = getDateFromKey(dateKey, timeZone);
  return date.toLocaleDateString(locale ?? undefined, { ...options, timeZone });
}

export function formatDateRangePart(
  date: Date,
  locale: string,
  timeZone: string = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(locale, { ...options, timeZone });
}
