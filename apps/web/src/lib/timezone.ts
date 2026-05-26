export function getAppTimeZone() {
  return process.env.APP_TIMEZONE ?? process.env.TZ ?? "Asia/Kolkata";
}

/** Hour (0–23) when the work day rolls over. Use 6 for night shifts (10 PM–6 AM stays one day). Default 0 = midnight. */
export function getBusinessDayStartHour() {
  const raw = process.env.APP_DAY_START_HOUR ?? "0";
  const hour = Number(raw);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return 0;
  return Math.floor(hour);
}

function getZonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  ) as Record<string, string>;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const values = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return asUtc - date.getTime();
}

function zonedLocalTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMs);
}

function addCalendarDays(year: number, month: number, day: number, delta: number) {
  const next = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate()
  };
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatBusinessDateInput(date = new Date(), timeZone = getAppTimeZone()) {
  const startHour = getBusinessDayStartHour();
  if (startHour === 0) {
    return date.toLocaleDateString("en-CA", { timeZone });
  }

  const values = getZonedParts(date, timeZone);
  let year = Number(values.year);
  let month = Number(values.month);
  let day = Number(values.day);
  const hour = Number(values.hour);

  if (hour < startHour) {
    ({ year, month, day } = addCalendarDays(year, month, day, -1));
  }

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

/** @deprecated Use formatBusinessDateInput for attendance/work-day labels. */
export function formatDateInput(date = new Date(), timeZone = getAppTimeZone()) {
  return formatBusinessDateInput(date, timeZone);
}

export function businessDayRangeForDateInput(dateStr: string, timeZone = getAppTimeZone()) {
  const startHour = getBusinessDayStartHour();
  const [year, month, day] = dateStr.split("-").map(Number);
  const next = addCalendarDays(year, month, day, 1);

  const start =
    startHour === 0
      ? zonedLocalTimeToUtc(year, month, day, 0, 0, 0, timeZone)
      : zonedLocalTimeToUtc(year, month, day, startHour, 0, 0, timeZone);
  const end =
    startHour === 0
      ? zonedLocalTimeToUtc(next.year, next.month, next.day, 0, 0, 0, timeZone)
      : zonedLocalTimeToUtc(next.year, next.month, next.day, startHour, 0, 0, timeZone);

  return { start, end };
}

export function businessDayRangeForInstant(instant = new Date(), timeZone = getAppTimeZone()) {
  const dateStr = formatBusinessDateInput(instant, timeZone);
  return businessDayRangeForDateInput(dateStr, timeZone);
}

export function dayBoundsForDateInput(dateStr: string, timeZone = getAppTimeZone()) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const offsetMs = getTimeZoneOffsetMs(start, timeZone);
  return {
    start: new Date(start.getTime() - offsetMs),
    end: new Date(end.getTime() - offsetMs)
  };
}

export function parseBusinessDateInput(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftBusinessDateInput(dateStr: string, deltaDays: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const shifted = addCalendarDays(year, month, day, deltaDays);
  return `${shifted.year}-${padDatePart(shifted.month)}-${padDatePart(shifted.day)}`;
}

export function businessDateInputDaysBefore(
  daysBefore: number,
  date = new Date(),
  timeZone = getAppTimeZone()
) {
  return shiftBusinessDateInput(formatBusinessDateInput(date, timeZone), -daysBefore);
}
