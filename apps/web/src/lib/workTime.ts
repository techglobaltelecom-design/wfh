import { prisma } from "@/lib/db";
import { businessDayRangeForDateInput } from "@/lib/timezone";

function closedSessionSeconds(session: { markedInAt: Date; markedOutAt: Date | null }) {
  if (!session.markedOutAt) return 0;
  return Math.max(0, Math.floor((session.markedOutAt.getTime() - session.markedInAt.getTime()) / 1000));
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

  const activeAttendance =
    attendances.find(
      (entry) => entry.markedOutAt === null && entry.markedInAt >= start && entry.markedInAt < end
    ) ?? null;
  const dayGrossClosedSeconds = attendances
    .filter((entry) => entry.id !== activeAttendance?.id)
    .reduce((acc, entry) => acc + closedSessionSeconds(entry), 0);

  const validBreaks = breaks.filter((entry) =>
    breakBelongsToAttendance(entry.startedAt, attendances, nowMs)
  );
  const activeBreakInAttendance =
    activeBreak && breakBelongsToAttendance(activeBreak.startedAt, attendances, nowMs)
      ? activeBreak
      : null;

  const dayBreakClosedSeconds = validBreaks
    .filter((entry) => entry.id !== activeBreakInAttendance?.id)
    .reduce((acc, entry) => acc + Math.floor((entry.durationMs ?? 0) / 1000), 0);

  const workSeconds = Math.max(0, dayGrossClosedSeconds - dayBreakClosedSeconds);

  const primarySession = attendances[0] ?? null;
  const lastClosedSession = [...attendances].reverse().find((entry) => entry.markedOutAt) ?? null;

  return {
    id: userId,
    fullName: employee.fullName,
    employeeId: employee.employeeId,
    workSeconds,
    breakSeconds: dayBreakClosedSeconds,
    grossSeconds: dayGrossClosedSeconds,
    activeAttendanceStartedAtMs: activeAttendance?.markedInAt.getTime() ?? null,
    breakStartedAtMs: activeBreakInAttendance?.startedAt.getTime() ?? null,
    markedInAt: primarySession?.markedInAt.toISOString() ?? null,
    markedOutAt: lastClosedSession?.markedOutAt?.toISOString() ?? null,
    clockedIn: Boolean(activeAttendance)
  };
}

export function resolveLiveWorkSeconds(
  row: Pick<
    EmployeeDailyWorkTime,
    "workSeconds" | "breakSeconds" | "grossSeconds" | "activeAttendanceStartedAtMs" | "breakStartedAtMs"
  >,
  nowMs: number
) {
  const activeAttendanceSeconds = row.activeAttendanceStartedAtMs
    ? Math.max(0, Math.floor((nowMs - row.activeAttendanceStartedAtMs) / 1000))
    : 0;
  const activeBreakSeconds = row.breakStartedAtMs
    ? Math.max(0, Math.floor((nowMs - row.breakStartedAtMs) / 1000))
    : 0;

  const grossSeconds = row.grossSeconds + activeAttendanceSeconds;
  const breakSeconds = row.breakSeconds + activeBreakSeconds;
  const workSeconds = Math.max(0, grossSeconds - breakSeconds);

  return { workSeconds, breakSeconds, grossSeconds };
}
