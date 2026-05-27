import { LeaveStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { businessDayRangeForInstant } from "@/lib/timezone";
import { calculateActiveWorkPercentage } from "./activity";

function toTodayUtcStart() {
  const { start } = businessDayRangeForInstant();
  return start;
}

function dayRange(date = new Date()) {
  return businessDayRangeForInstant(date);
}

async function getOpenAttendanceSession(userId: string) {
  return prisma.attendanceSession.findFirst({
    where: { userId, markedOutAt: null },
    orderBy: { markedInAt: "desc" }
  });
}

async function getOpenAttendanceSessionForBusinessDay(userId: string, date = new Date()) {
  const { start, end } = businessDayRangeForInstant(date);
  return prisma.attendanceSession.findFirst({
    where: {
      userId,
      markedOutAt: null,
      markedInAt: { gte: start, lt: end }
    },
    orderBy: { markedInAt: "desc" }
  });
}

async function closeAttendanceSession(
  session: { id: string; markedInAt: Date; userId: string },
  markedOutAt: Date
) {
  const activeBreak = await prisma.breakSession.findFirst({
    where: { userId: session.userId, endedAt: null },
    orderBy: { startedAt: "desc" }
  });
  if (activeBreak) {
    await prisma.breakSession.update({
      where: { id: activeBreak.id },
      data: {
        endedAt: markedOutAt,
        durationMs: markedOutAt.getTime() - activeBreak.startedAt.getTime()
      }
    });
  }

  const totalMinutes = Math.max(
    0,
    Math.floor((markedOutAt.getTime() - session.markedInAt.getTime()) / 60000)
  );

  return prisma.attendanceSession.update({
    where: { id: session.id },
    data: { markedOutAt, totalMinutes }
  });
}

async function closeStaleOpenSession(userId: string) {
  const open = await getOpenAttendanceSession(userId);
  if (!open) return;

  const { start: currentDayStart } = businessDayRangeForInstant();
  if (open.markedInAt >= currentDayStart) return;

  const { end: sessionDayEnd } = businessDayRangeForInstant(open.markedInAt);
  await closeAttendanceSession(open, sessionDayEnd);
}

export async function closeStaleOpenSessionsForUser(userId: string) {
  await closeStaleOpenSession(userId);
}

/** Fix forgotten clock-outs and multi-day bad records in the database. */
export async function repairCorruptedAttendanceSessions(userId: string) {
  await closeStaleOpenSession(userId);

  const maxShiftMs = 16 * 60 * 60 * 1000;
  const closed = await prisma.attendanceSession.findMany({
    where: { userId, markedOutAt: { not: null } }
  });

  for (const session of closed) {
    if (!session.markedOutAt) continue;
    const durationMs = session.markedOutAt.getTime() - session.markedInAt.getTime();
    if (durationMs <= maxShiftMs) continue;

    const { end: sessionDayEnd } = businessDayRangeForInstant(session.markedInAt);
    const repairedOut =
      session.markedOutAt.getTime() > sessionDayEnd.getTime()
        ? sessionDayEnd
        : session.markedOutAt;

    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: {
        markedOutAt: repairedOut,
        totalMinutes: Math.max(
          0,
          Math.floor((repairedOut.getTime() - session.markedInAt.getTime()) / 60000)
        )
      }
    });
  }
}

export async function ensureAttendanceIntegrity(userId: string) {
  await repairCorruptedAttendanceSessions(userId);
}

export async function markAttendanceIn(userId: string) {
  await ensureAttendanceIntegrity(userId);

  const { start, end } = dayRange();
  const openInCurrentDay = await getOpenAttendanceSessionForBusinessDay(userId);
  if (openInCurrentDay) return openInCurrentDay;

  await closeStaleOpenSession(userId);

  const todaySession = await prisma.attendanceSession.findFirst({
    where: {
      userId,
      markedInAt: { gte: start, lt: end }
    },
    orderBy: { markedInAt: "desc" }
  });

  // Only one full attendance cycle per work day.
  if (todaySession?.markedOutAt) return null;

  return prisma.attendanceSession.create({
    data: {
      userId,
      date: start,
      markedInAt: new Date()
    }
  });
}

export async function markAttendanceOut(userId: string) {
  const open = await getOpenAttendanceSession(userId);
  if (!open) {
    return null;
  }

  const { start: currentDayStart } = businessDayRangeForInstant();
  if (open.markedInAt < currentDayStart) {
    await closeStaleOpenSession(userId);
    return null;
  }

  return closeAttendanceSession(open, new Date());
}

export async function startWork(userId: string) {
  const session = await markAttendanceIn(userId);
  if (!session) return null;
  return prisma.attendanceSession.update({
    where: { id: session.id },
    data: { workStartedAt: new Date() }
  });
}

export async function endWork(userId: string) {
  const latest = await prisma.attendanceSession.findFirst({
    where: { userId },
    orderBy: { markedInAt: "desc" }
  });
  if (!latest) {
    return null;
  }
  if (latest.workEndedAt) return latest;
  return prisma.attendanceSession.update({
    where: { id: latest.id },
    data: { workEndedAt: new Date() }
  });
}

export async function isEmployeeOnBreak(userId: string) {
  const activeBreak = await prisma.breakSession.findFirst({
    where: { userId, endedAt: null },
    select: { id: true }
  });
  return Boolean(activeBreak);
}

export async function isEmployeeClockedInToday(userId: string) {
  const openSession = await getOpenAttendanceSessionForBusinessDay(userId);
  return Boolean(openSession);
}

export async function resolveAgentPresenceStatus(
  userId: string,
  agentStatus: "ONLINE" | "BUSY" | "AWAY"
): Promise<"ONLINE" | "BUSY" | "AWAY"> {
  const [clockedIn, onBreak] = await Promise.all([
    isEmployeeClockedInToday(userId),
    isEmployeeOnBreak(userId)
  ]);
  if (!clockedIn || onBreak) return "AWAY";
  return agentStatus;
}

export async function resolveDisplayPresenceStatus(
  userId: string
): Promise<"ONLINE" | "AWAY"> {
  const [clockedIn, onBreak] = await Promise.all([
    isEmployeeClockedInToday(userId),
    isEmployeeOnBreak(userId)
  ]);
  if (clockedIn && !onBreak) return "ONLINE";
  return "AWAY";
}

export async function startBreak(userId: string) {
  const todayAttendance = await getOpenAttendanceSessionForBusinessDay(userId);
  if (!todayAttendance) return null;

  const activeBreak = await prisma.breakSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" }
  });
  if (activeBreak) return activeBreak;

  return prisma.breakSession.create({
    data: { userId, startedAt: new Date() }
  });
}

export async function endBreak(userId: string) {
  const latest = await prisma.breakSession.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" }
  });
  if (!latest) {
    return null;
  }
  const endedAt = new Date();
  return prisma.breakSession.update({
    where: { id: latest.id },
    data: {
      endedAt,
      durationMs: endedAt.getTime() - latest.startedAt.getTime()
    }
  });
}

export async function addTaskUpdate(
  userId: string,
  input: { summary: string; blockers?: string; progressPct: number }
) {
  return prisma.dailyTaskUpdate.create({
    data: {
      userId,
      taskDate: toTodayUtcStart(),
      summary: input.summary,
      blockers: input.blockers,
      progressPct: input.progressPct
    }
  });
}

export async function requestLeave(
  userId: string,
  input: { fromDate: string; toDate: string; reason: string }
) {
  return prisma.leaveRequest.create({
    data: {
      userId,
      fromDate: new Date(input.fromDate),
      toDate: new Date(input.toDate),
      reason: input.reason
    }
  });
}

export async function updateWorkStatus(
  userId: string,
  status: "ONLINE" | "BUSY" | "AWAY"
) {
  return prisma.workStatusEvent.create({
    data: { userId, status }
  });
}

export async function uploadScreenshotRecord(userId: string, storageKey: string) {
  return prisma.screenshot.create({
    data: {
      userId,
      capturedAt: new Date(),
      storageKey
    }
  });
}

export async function employeeSnapshot(userId: string) {
  const [attendance, breaks, tasks, leaves, status] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { userId },
      orderBy: { markedInAt: "desc" },
      take: 5
    }),
    prisma.breakSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5
    }),
    prisma.dailyTaskUpdate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.workStatusEvent.findFirst({
      where: { userId },
      orderBy: { at: "desc" }
    })
  ]);

  const resolvedStatus = await resolveDisplayPresenceStatus(userId);
  return { attendance, breaks, tasks, leaves, status: resolvedStatus };
}

export async function approveLeave(
  leaveId: string,
  adminId: string,
  status: LeaveStatus,
  decisionNote?: string
) {
  return prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      status,
      reviewedById: adminId,
      reviewedAt: new Date(),
      decisionNote
    }
  });
}

export async function listPendingLeaves() {
  return prisma.leaveRequest.findMany({
    where: { status: LeaveStatus.PENDING },
    include: {
      user: { select: { fullName: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function aggregateHoursByUser() {
  return prisma.attendanceSession.groupBy({
    by: ["userId"],
    _sum: { totalMinutes: true }
  });
}

export async function activeWorkPercentage(userId: string) {
  const rows = await prisma.activityEvent.findMany({ where: { userId } });
  if (!rows.length) return 0;
  const totals = rows.reduce(
    (acc, row) => {
      acc.active += row.activeSeconds;
      acc.idle += row.idleSeconds;
      return acc;
    },
    { active: 0, idle: 0 }
  );
  return calculateActiveWorkPercentage(totals.active, totals.idle);
}

export async function listEmployees() {
  return prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, fullName: true, employeeId: true }
  });
}
