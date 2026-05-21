import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { signStorageKey } from "@/lib/storage";
import { dayBoundsForDateInput, formatDateInput } from "@/lib/timezone";
import { pruneOldScreenshots } from "@/server/screenshots/retention";
import { LocalTime } from "@/components/LocalTime";

export default async function ScreenshotTimelinePage({
  searchParams
}: {
  searchParams: Promise<{ date?: string; employeeId?: string }>;
}) {
  await requireRole("ADMIN");
  await pruneOldScreenshots();
  const params = await searchParams;
  const dateValue = params.date ?? formatDateInput();
  const employeeId = params.employeeId;
  const { start: dayStart, end: dayEnd } = dayBoundsForDateInput(dateValue);
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, fullName: true, employeeId: true },
    orderBy: { fullName: "asc" }
  });

  const rows = await prisma.screenshot.findMany({
    where: {
      ...(employeeId ? { userId: employeeId } : {}),
      capturedAt: {
        gte: dayStart,
        lte: dayEnd
      }
    },
    include: {
      user: { select: { fullName: true, employeeId: true } }
    },
    orderBy: { capturedAt: "asc" }
  });

  const selectedEmployee = employees.find((employee) => employee.id === employeeId) ?? null;

  return (
    <main className="container grid">
      <section className="card">
        <h1 className="page-title">Screenshot Timeline</h1>
        <p className="subtitle">
          Screenshots stay visible for the full selected day, including exact capture time.
          {selectedEmployee ? ` Filtered: ${selectedEmployee.fullName}.` : " Showing all employees."}
        </p>
        <form method="GET" className="row-wrap">
          <input type="date" name="date" defaultValue={dateValue} required />
          <select name="employeeId" defaultValue={employeeId ?? ""}>
            <option value="">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName} ({employee.employeeId ?? "N/A"})
              </option>
            ))}
          </select>
          <button type="submit">Load Day</button>
        </form>
      </section>

      <section className="screenshot-grid">
        {rows.map((row) => (
          <article className="card" key={row.id}>
            <a
              href={`/api/admin/screenshots/${row.id}?sig=${signStorageKey(row.storageKey)}`}
              target="_blank"
              rel="noreferrer"
              title="Open full screenshot"
            >
              <img
                src={`/api/admin/screenshots/${row.id}?sig=${signStorageKey(row.storageKey)}`}
                alt={`Screenshot from ${row.user.fullName}`}
                className="screenshot-img"
              />
            </a>
            <p>
              <strong>{row.user.fullName}</strong>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              EMP ID: {row.user.employeeId ?? "N/A"}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              Time: <LocalTime value={row.capturedAt.toISOString()} />
            </p>
            <div className="row-wrap" style={{ marginTop: 10 }}>
              <a
                className="button-link"
                href={`/api/admin/screenshots/${row.id}?sig=${signStorageKey(row.storageKey)}`}
                target="_blank"
                rel="noreferrer"
              >
                Open Full Image
              </a>
            </div>
          </article>
        ))}
        {rows.length === 0 && <p>No screenshots found for this day.</p>}
      </section>
    </main>
  );
}
