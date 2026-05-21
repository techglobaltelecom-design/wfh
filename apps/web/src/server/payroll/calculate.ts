import { prisma } from "@/lib/db";
import { computePayroll } from "./math";

export async function generatePayrollForPeriod(periodStart: Date, periodEnd: Date) {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true }
  });

  const created = await Promise.all(
    employees.map(async (employee) => {
      const [sessions, activities] = await Promise.all([
        prisma.attendanceSession.findMany({
          where: {
            userId: employee.id,
            date: { gte: periodStart, lte: periodEnd }
          }
        }),
        prisma.activityEvent.findMany({
          where: {
            userId: employee.id,
            capturedAt: { gte: periodStart, lte: periodEnd }
          }
        })
      ]);

      const totalMinutes = sessions.reduce((acc, row) => acc + row.totalMinutes, 0);
      const totals = activities.reduce(
        (acc, row) => {
          acc.active += row.activeSeconds;
          acc.idle += row.idleSeconds;
          return acc;
        },
        { active: 0, idle: 0 }
      );

      const payroll = computePayroll({
        totalMinutes,
        activeSeconds: totals.active,
        idleSeconds: totals.idle
      });

      return prisma.payrollEntry.create({
        data: {
          userId: employee.id,
          periodStart,
          periodEnd,
          totalHours: payroll.totalHours,
          overtimeHours: payroll.overtimeHours,
          deductionAmount: payroll.deductionAmount,
          estimatedSalary: payroll.estimatedSalary,
          activeWorkPct: payroll.activeWorkPct
        }
      });
    })
  );

  return created;
}
