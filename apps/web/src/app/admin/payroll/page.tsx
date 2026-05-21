import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { generatePayrollAction } from "../actions";

export default async function PayrollPage() {
  await requireRole("ADMIN");
  const latest = await prisma.payrollEntry.findMany({
    include: { user: { select: { fullName: true, employeeId: true } } },
    orderBy: { generatedAt: "desc" },
    take: 20
  });

  return (
    <main className="container grid">
      <section className="card">
        <h1 className="page-title">Payroll Console</h1>
      </section>
      <form action={generatePayrollAction} className="card row-wrap">
        <input type="date" name="periodStart" required />
        <input type="date" name="periodEnd" required />
        <button type="submit">Generate Payroll</button>
      </form>

      <section className="grid">
        {latest.map((row) => (
          <article key={row.id} className="card">
            <p>
              <strong>{row.user.fullName}</strong> (EMP ID: {row.user.employeeId ?? "N/A"})
            </p>
            <p>
              Hours: {row.totalHours} | Overtime: {row.overtimeHours} | Active: {row.activeWorkPct}%
            </p>
            <p>
              Deductions: {row.deductionAmount} | Estimated Salary: {row.estimatedSalary}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
