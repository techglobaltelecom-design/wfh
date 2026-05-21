import { logoutAction } from "@/app/actions/logout";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { employeeSnapshot } from "@/server/services/employeeService";
import { submitLeaveRequest, submitTaskUpdate } from "./actions";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { EmployeeKioskSidebar } from "./EmployeeKioskSidebar";

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

export default async function EmployeePage() {
  const session = await requireRole("EMPLOYEE");
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const dayOfWeek = todayStart.getDay(); // 0=Sunday, 1=Monday ... 6=Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - daysSinceMonday);
  const sundayStart = new Date(weekStart);
  sundayStart.setDate(weekStart.getDate() + 6); // Sunday 00:00
  const weekEnd =
    dayOfWeek === 0
      ? todayStart
      : new Date(Math.min(tomorrowStart.getTime(), sundayStart.getTime()));

  const [snapshot, weekAttendances, todayAttendances, weekBreaks, todayBreaks, activeBreak] = await Promise.all([
    employeeSnapshot(session.id),
    prisma.attendanceSession.findMany({
      where: {
        userId: session.id,
        markedInAt: { gte: weekStart, lt: weekEnd }
      },
      orderBy: { markedInAt: "desc" }
    }),
    prisma.attendanceSession.findMany({
      where: {
        userId: session.id,
        markedInAt: { gte: todayStart, lt: tomorrowStart }
      },
      orderBy: { markedInAt: "desc" }
    }),
    prisma.breakSession.findMany({
      where: {
        userId: session.id,
        startedAt: { gte: weekStart, lt: weekEnd }
      },
      orderBy: { startedAt: "desc" }
    }),
    prisma.breakSession.findMany({
      where: {
        userId: session.id,
        startedAt: { gte: todayStart, lt: tomorrowStart }
      },
      orderBy: { startedAt: "desc" }
    }),
    prisma.breakSession.findFirst({
      where: { userId: session.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    })
  ]);
  const nowMs = Date.now();
  const effectiveStatus = snapshot.status === "BUSY" ? "ONLINE" : snapshot.status;

  const activeAttendance =
    todayAttendances.find((entry) => entry.markedOutAt === null) ?? null;
  const activeAttendanceStartedAtMs = activeAttendance?.markedInAt.getTime() ?? null;

  const dayGrossClosedSeconds = todayAttendances
    .filter((entry) => entry.id !== activeAttendance?.id)
    .reduce((acc, entry) => acc + closedSessionSeconds(entry), 0);

  const weekGrossClosedSeconds = weekAttendances
    .filter((entry) => entry.id !== activeAttendance?.id)
    .reduce((acc, entry) => acc + closedSessionSeconds(entry), 0);

  const validTodayBreaks = todayBreaks.filter((entry) =>
    breakBelongsToAttendance(entry.startedAt, todayAttendances, nowMs)
  );
  const validWeekBreaks = weekBreaks.filter((entry) =>
    breakBelongsToAttendance(entry.startedAt, weekAttendances, nowMs)
  );
  const activeBreakInAttendance =
    activeBreak &&
    breakBelongsToAttendance(activeBreak.startedAt, todayAttendances, nowMs)
      ? activeBreak
      : null;

  const breakStartedAtMs = activeBreakInAttendance?.startedAt.getTime() ?? null;
  const dayBreakClosedSeconds = validTodayBreaks
    .filter((entry) => entry.id !== activeBreakInAttendance?.id)
    .reduce((acc, entry) => acc + Math.floor((entry.durationMs ?? 0) / 1000), 0);
  const weekBreakClosedSeconds = validWeekBreaks
    .filter((entry) => entry.id !== activeBreakInAttendance?.id)
    .reduce((acc, entry) => acc + Math.floor((entry.durationMs ?? 0) / 1000), 0);

  return (
    <main className="container kiosk-layout">
      <aside className="card kiosk-sidebar">
        <EmployeeKioskSidebar
          fullName={session.fullName}
          employeeId={session.employeeId}
          presenceStatus={effectiveStatus}
          weekGrossClosedSeconds={weekGrossClosedSeconds}
          weekBreakClosedSeconds={weekBreakClosedSeconds}
          attendanceEntries={weekAttendances.length}
          activeAttendanceStartedAtMs={activeAttendanceStartedAtMs}
          breakStartedAtMs={breakStartedAtMs}
          dayGrossClosedSeconds={dayGrossClosedSeconds}
          dayBreakClosedSeconds={dayBreakClosedSeconds}
        />
        <form action={logoutAction}>
          <button type="submit" className="button-muted" style={{ width: "100%" }}>
            Logout
          </button>
        </form>
      </aside>

      <section className="grid kiosk-main">
        <section className="card">
          <QuickActionsPanel variant="kiosk" />
        </section>

        <section className="card">
          <h2 className="section-title">Daily Task Update</h2>
          <p className="muted form-help">
            Fill all 3 fields: what you worked on today, blockers (if any), and completion percent.
          </p>
          <form action={submitTaskUpdate} className="grid" style={{ maxWidth: 640 }}>
            <label>
              Work Summary
              <input name="summary" required />
            </label>
            <label>
              Blockers (optional)
              <input name="blockers" />
            </label>
            <label>
              Completion Percentage (0-100)
              <input
                type="number"
                name="progressPct"
                min={0}
                max={100}
                defaultValue={0}
                required
              />
            </label>
            <button type="submit">Submit Task Update</button>
          </form>
        </section>

        <section className="card">
          <h2 className="section-title">Leave Request</h2>
          <form action={submitLeaveRequest} className="grid" style={{ maxWidth: 640 }}>
            <input type="date" name="fromDate" required />
            <input type="date" name="toDate" required />
            <textarea name="reason" placeholder="Reason" required />
            <button type="submit">Request Leave</button>
          </form>
        </section>
      </section>
    </main>
  );
}
