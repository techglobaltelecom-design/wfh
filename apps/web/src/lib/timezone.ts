export function getAppTimeZone() {
  return process.env.APP_TIMEZONE ?? process.env.TZ ?? "Asia/Kolkata";
}

export function formatDateInput(date = new Date(), timeZone = getAppTimeZone()) {
  return date.toLocaleDateString("en-CA", { timeZone });
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

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
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

  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
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
