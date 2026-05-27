import { prisma } from "@/lib/db";
import { formatDateInput } from "@/lib/timezone";
import { getEmployeeDailyWorkTime } from "@/lib/workTime";
import {
  activeWorkPercentage,
  aggregateHoursByUser,
  closeStaleOpenSessionsForUser,
  ensureAttendanceIntegrity,
  listEmployees,
  resolveDisplayPresenceStatus
} from "./employeeService";

export async function getEmployeePresenceSnapshot() {
  const employees = await listEmployees();
  const employeePresence = await Promise.all(
    employees.map(async (employee) => {
      await ensureAttendanceIntegrity(employee.id);
      const latestStatus = await prisma.workStatusEvent.findFirst({
        where: { userId: employee.id },
        orderBy: { at: "desc" }
      });
      const status = await resolveDisplayPresenceStatus(employee.id);
      return {
        ...employee,
        status,
        statusAt: latestStatus?.at ?? null
      };
    })
  );
  const activeNow = employeePresence.filter((item) => item.status === "ONLINE").length;
  return { activeNow, employeePresence };
}

export async function getAdminDashboard() {
  const [employeeCount, pendingLeaves, hourGroups, employees] = await Promise.all([
    prisma.user.count({ where: { role: "EMPLOYEE" } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    aggregateHoursByUser(),
    listEmployees()
  ]);

  const totals = hourGroups.reduce((acc, row) => acc + (row._sum.totalMinutes ?? 0), 0);
  const { activeNow, employeePresence } = await getEmployeePresenceSnapshot();

  const activity = await Promise.all(
    employees.map(async (employee) => ({
      ...employee,
      activeWorkPct: await activeWorkPercentage(employee.id)
    }))
  );

  return {
    employeeCount,
    activeNow,
    pendingLeaves,
    totalHours: Number((totals / 60).toFixed(2)),
    activity,
    employeePresence
  };
}

export async function getEmployeesDailyWorkTime(dateInput?: string) {
  const date = dateInput ?? formatDateInput();
  const employees = await listEmployees();

  await Promise.all(employees.map((employee) => ensureAttendanceIntegrity(employee.id)));

  return Promise.all(
    employees.map((employee) => getEmployeeDailyWorkTime(employee.id, employee, date))
  );
}

export async function attendanceRecords(limit = 100) {
  return prisma.attendanceSession.findMany({
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { markedInAt: "desc" },
    take: limit
  });
}

export async function employeeReports() {
  const employees = await listEmployees();
  return Promise.all(
    employees.map(async (employee) => {
      const [sessions, tasks] = await Promise.all([
        prisma.attendanceSession.findMany({ where: { userId: employee.id } }),
        prisma.dailyTaskUpdate.findMany({ where: { userId: employee.id } })
      ]);
      const totalMinutes = sessions.reduce((acc, row) => acc + row.totalMinutes, 0);
      const avgProgress =
        tasks.length > 0
          ? tasks.reduce((acc, task) => acc + task.progressPct, 0) / tasks.length
          : 0;
      return {
        ...employee,
        totalHours: Number((totalMinutes / 60).toFixed(2)),
        avgTaskProgress: Number(avgProgress.toFixed(2)),
        tasksSubmitted: tasks.length
      };
    })
  );
}
