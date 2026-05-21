import { logoutAction } from "@/app/actions/logout";
import { requireRole } from "@/lib/rbac";
import { getAdminDashboard, employeeReports } from "@/server/services/adminService";
import { listPendingLeaves } from "@/server/services/employeeService";
import Link from "next/link";
import { decideLeaveAction } from "./actions";
import { AdminPasswordCard } from "./AdminPasswordCard";
import { AdminAddEmployeeCard } from "./AdminAddEmployeeCard";
import { AdminPresenceBoard } from "./AdminPresenceBoard";

export default async function AdminPage() {
  const session = await requireRole("ADMIN");
  const [dashboard, leaves, reports] = await Promise.all([
    getAdminDashboard(),
    listPendingLeaves(),
    employeeReports()
  ]);
  const initialPresence = dashboard.employeePresence.map((employee) => ({
    ...employee,
    statusAt: employee.statusAt ? employee.statusAt.toISOString() : null
  }));

  return (
    <main className="container grid">
      <header className="card header-row">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p>{session.fullName}</p>
          <p className="muted">EMP ID: {session.employeeId ?? "N/A"}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="button-muted">
            Logout
          </button>
        </form>
      </header>

      <section className="stats-grid">
        <article className="card">
          <h3>Employees</h3>
          <p className="stat-value">{dashboard.employeeCount}</p>
        </article>
        <article className="card">
          <h3>Online Now</h3>
          <p className="stat-value">{dashboard.activeNow}</p>
        </article>
        <article className="card">
          <h3>Pending Leaves</h3>
          <p className="stat-value">{dashboard.pendingLeaves}</p>
        </article>
        <article className="card">
          <h3>Total Hours</h3>
          <p className="stat-value">{dashboard.totalHours}</p>
        </article>
      </section>

      <AdminPresenceBoard
        initialActiveNow={dashboard.activeNow}
        initialPresence={initialPresence}
      />

      <section className="card">
        <h2 className="section-title">Leave Approval</h2>
        {leaves.length === 0 && <p>No pending requests.</p>}
        {leaves.map((leave) => (
          <form
            key={leave.id}
            action={decideLeaveAction}
            className="card"
            style={{ marginBottom: 8 }}
          >
            <p>
              <strong>{leave.user.fullName}</strong> - {leave.reason}
            </p>
            <input type="hidden" name="leaveId" value={leave.id} />
            <input name="decisionNote" placeholder="Decision note (optional)" />
            <button type="submit" name="status" value="APPROVED" style={{ marginTop: 8 }}>
              Approve
            </button>
            <button type="submit" name="status" value="REJECTED" style={{ marginLeft: 8 }}>
              Reject
            </button>
          </form>
        ))}
      </section>

      <section className="card">
        <h2 className="section-title">Performance Tracking</h2>
        {reports.map((report) => (
          <p key={report.id}>
            {report.fullName}: {report.totalHours}h, Avg Task Progress {report.avgTaskProgress}%,
            Tasks {report.tasksSubmitted}
          </p>
        ))}
      </section>

      <section className="row-wrap">
        <Link href="/admin/payroll" className="button-link">
          Open Payroll Console
        </Link>
        <Link href="/admin/tasks" className="button-link">
          Open Task Monitor
        </Link>
        <Link href="/admin/screenshots" className="button-link">
          Open Screenshot Timeline
        </Link>
      </section>

      <AdminAddEmployeeCard />
      <AdminPasswordCard />
    </main>
  );
}
