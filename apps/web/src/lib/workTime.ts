import { prisma } from "@/lib/db";
import { businessDayRangeForDateInput } from "@/lib/timezone";

function sessionSecondsInRange(
  session: { markedInAt: Date; markedOutAt: Date | null },
  rangeStart: Date,
  rangeEnd: Date,
  nowMs: number
) {
  const sessionStart = session.markedInAt.getTime();
  const sessionEnd = session.markedOutAt?.getTime() ?? nowMs;
  const clipStart = Math.max(sessionStart, rangeStart.getTime());
  const clipEnd = Math.min(sessionEnd, rangeEnd.getTime());
  return Math.max(0, Math.floor((clipEnd - clipStart) / 1000));
}

function sessionOverlapsRange(
  session: { markedInAt: Date; markedOutAt: Date | null },
  rangeStart: Date,
  rangeEnd: Date
) {
  const sessionEnd = session.markedOutAt?.getTime() ?? Number.POSITIVE_INFINITY;
  return session.markedInAt.getTime() < rangeEnd.getTime() && sessionEnd > rangeStart.getTime();
}

function breakBelongsToAttendance(
  breakStart: Date,
  attendances: Array<{ markedInAt: Date; markedOutAt: Date | null }>,
  nowMs: number
) {
  const breakMs = breakStart.getTime();
  return attendances.some((attendance) => {
    const startMs = attendance.markedInAt.getTime();
    const endMs = attendance.markedOutAt ? attendance.markedOutAt.getTime() : nowMs;
    return breakMs >= startMs && breakMs <= endMs;
  });
}

function breakSecondsInRange(
  breakSession: { startedAt: Date; endedAt: Date | null; durationMs: number | null },
  rangeStart: Date,
  rangeEnd: Date,
  nowMs: number
) {
  const breakEnd = breakSession.endedAt?.getTime() ?? nowMs;
  const clipStart = Math.max(breakSession.startedAt.getTime(), rangeStart.getTime());
  const clipEnd = Math.min(breakEnd, rangeEnd.getTime());
  return Math.max(0, Math.floor((clipEnd - clipStart) / 1000));
}

export function formatWorkDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export type EmployeeDailyWorkTime = {
  id: string;
  fullName: string;
  employeeId: string | null;
  workSeconds: number;
  breakSeconds: number;
  grossSeconds: number;
  activeAttendanceStartedAtMs: number | null;
  breakStartedAtMs: number | null;
  markedInAt: string | null;
  markedOutAt: string | null;
  clockedIn: boolean;
};

export async function getEmployeeDailyWorkTime(
  userId: string,
  employee: { fullName: string; employeeId: string | null },
  dateInput: string,
  nowMs = Date.now()
): Promise<EmployeeDailyWorkTime> {
  const { start, end } = businessDayRangeForDateInput(dateInput);
  const [attendances, breaks, activeBreak] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: {
        userId,
        markedInAt: { lt: end },
        OR: [{ markedOutAt: null }, { markedOutAt: { gt: start } }]
      },
      orderBy: { markedInAt: "asc" }
    }),
    prisma.breakSession.findMany({
      where: {
        userId,
        startedAt: { lt: end },
        OR: [{ endedAt: null }, { endedAt: { gt: start } }]
      },
      orderBy: { startedAt: "asc" }
    }),
    prisma.breakSession.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: "desc" }
    })
  ]);

  const dayAttendances = attendances.filter((entry) => sessionOverlapsRange(entry, start, end));

  const activeAttendance =
    dayAttendances.find(
      (entry) =>
        entry.markedOutAt === null && entry.markedInAt >= start && entry.markedInAt < end
    ) ?? null;

  const dayGrossSeconds = dayAttendances
    .filter((entry) => entry.id !== activeAttendance?.id)
    .reduce(
      (acc, entry) => acc + sessionSecondsInRange(entry, start, end, nowMs),
      0
    );

  const validBreaks = breaks.filter((entry) =>
    breakBelongsToAttendance(entry.startedAt, dayAttendances, nowMs)
  );
  const activeBreakInAttendance =
    activeBreak && breakBelongsToAttendance(activeBreak.startedAt, dayAttendances, nowMs)
      ? activeBreak
      : null;

  const dayBreakClosedSeconds = validBreaks
    .filter((entry) => entry.id !== activeBreakInAttendance?.id)
    .reduce((acc, entry) => acc + breakSecondsInRange(entry, start, end, nowMs), 0);

  const workSeconds = Math.max(0, dayGrossSeconds - dayBreakClosedSeconds);

  const displaySession =
    activeAttendance ??
    [...dayAttendances]
      .filter((entry) => entry.markedInAt >= start && entry.markedInAt < end)
      .sort((a, b) => b.markedInAt.getTime() - a.markedInAt.getTime())[0] ??
    null;

  return {
    id: userId,
    fullName: employee.fullName,
    employeeId: employee.employeeId,
    workSeconds,
    breakSeconds: dayBreakClosedSeconds,
    grossSeconds: dayGrossSeconds,
    activeAttendanceStartedAtMs: activeAttendance?.markedInAt.getTime() ?? null,
    breakStartedAtMs: activeBreakInAttendance?.startedAt.getTime() ?? null,
    markedInAt: displaySession?.markedInAt.toISOString() ?? null,
    markedOutAt: displaySession?.markedOutAt?.toISOString() ?? null,
    clockedIn: Boolean(activeAttendance)
  };
}

export function resolveLiveWorkSeconds(
  row: Pick<
    EmployeeDailyWorkTime,
    | "workSeconds"
    | "breakSeconds"
    | "grossSeconds"
    | "activeAttendanceStartedAtMs"
    | "breakStartedAtMs"
    | "clockedIn"
  >,
  nowMs: number
) {
  if (!row.clockedIn || !row.activeAttendanceStartedAtMs) {
    return {
      workSeconds: row.workSeconds,
      breakSeconds: row.breakSeconds,
      grossSeconds: row.grossSeconds
    };
  }

  const activeAttendanceSeconds = Math.max(
    0,
    Math.floor((nowMs - row.activeAttendanceStartedAtMs) / 1000)
  );
  const activeBreakSeconds = row.breakStartedAtMs
    ? Math.max(0, Math.floor((nowMs - row.breakStartedAtMs) / 1000))
    : 0;

  const grossSeconds = row.grossSeconds + activeAttendanceSeconds;
  const breakSeconds = row.breakSeconds + activeBreakSeconds;
  const workSeconds = Math.max(0, grossSeconds - breakSeconds);

  return { workSeconds, breakSeconds, grossSeconds };
}
