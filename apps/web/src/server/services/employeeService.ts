import { LeaveStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateActiveWorkPercentage } from "./activity";

function toTodayUtcStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function dayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function markAttendanceIn(userId: string) {
  const { start, end } = dayRange();
  const todaySession = await prisma.attendanceSession.findFirst({
    where: {
      userId,
      markedInAt: { gte: start, lt: end }
    },
    orderBy: { markedInAt: "desc" }
  });

  // Only one full attendance cycle per day.
  // If today's session is still active, keep using it.
  if (todaySession && !todaySession.markedOutAt) return todaySession;
  if (todaySession && todaySession.markedOutAt) return null;

  return prisma.attendanceSession.create({
    data: {
      userId,
      date: start,
      markedInAt: new Date()
    }
  });
}

export async function markAttendanceOut(userId: string) {
  const { start, end } = dayRange();
  const open = await prisma.attendanceSession.findFirst({
    where: {
      userId,
      markedOutAt: null,
      markedInAt: { gte: start, lt: end }
    },
    orderBy: { markedInAt: "desc" }
  });
  if (!open) {
    return null;
  }

  const markedOutAt = new Date();
  const activeBreak = await prisma.breakSession.findFirst({
    where: { userId, endedAt: null },
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
    Math.floor((markedOutAt.getTime() - open.markedInAt.getTime()) / 60000)
  );

  return prisma.attendanceSession.update({
    where: { id: open.id },
    data: { markedOutAt, totalMinutes }
  });
}

export async function startWork(userId: string) {
  const session = await markAttendanceIn(userId);
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

export async function startBreak(userId: string) {
  const { start, end } = dayRange();
  const todayAttendance = await prisma.attendanceSession.findFirst({
    where: {
      userId,
      markedOutAt: null,
      markedInAt: { gte: start, lt: end }
    },
    orderBy: { markedInAt: "desc" }
  });
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

  return { attendance, breaks, tasks, leaves, status: status?.status ?? "AWAY" };
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
