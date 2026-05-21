import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return new Date(next.getTime() - 1);
}

export default async function AdminTasksPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string; employeeId?: string }>;
}) {
  await requireRole("ADMIN");

  const params = await searchParams;
  const selectedDate = params.date ? new Date(params.date) : new Date();
  const employeeId = params.employeeId;
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);
  const dateValue = dayStart.toISOString().slice(0, 10);

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, fullName: true, employeeId: true },
    orderBy: { fullName: "asc" }
  });

  const tasks = await prisma.dailyTaskUpdate.findMany({
    where: {
      ...(employeeId ? { userId: employeeId } : {}),
      createdAt: {
        gte: dayStart,
        lte: dayEnd
      }
    },
    include: {
      user: {
        select: { fullName: true, employeeId: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="container grid">
      <section className="card">
        <h1 className="page-title">Employee Task Monitor</h1>
        <p className="subtitle">Review submitted daily tasks by employee and day.</p>
        <form method="GET" className="row-wrap" style={{ marginTop: 10 }}>
          <input type="date" name="date" defaultValue={dateValue} required />
          <select name="employeeId" defaultValue={employeeId ?? ""}>
            <option value="">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName} ({employee.employeeId ?? "N/A"})
              </option>
            ))}
          </select>
          <button type="submit">Load Tasks</button>
        </form>
      </section>

      <section className="grid">
        {tasks.length === 0 && <p>No tasks found for selected filters.</p>}
        {tasks.map((task) => (
          <article className="card" key={task.id}>
            <p style={{ margin: 0 }}>
              <strong>{task.user.fullName}</strong> (EMP ID: {task.user.employeeId ?? "N/A"})
            </p>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Submitted: {task.createdAt.toLocaleString()}
            </p>
            <p style={{ margin: "12px 0 6px" }}>
              <strong>Summary:</strong> {task.summary}
            </p>
            <p style={{ margin: "0 0 6px" }}>
              <strong>Blockers:</strong> {task.blockers?.trim() ? task.blockers : "None"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Progress:</strong> {task.progressPct}%
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
