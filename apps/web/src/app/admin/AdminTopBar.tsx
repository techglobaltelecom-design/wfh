import Link from "next/link";
import { logoutAction } from "@/app/actions/logout";

export function AdminTopBar({
  fullName,
  employeeId
}: {
  fullName: string;
  employeeId: string | null;
}) {
  return (
    <header className="card admin-top-bar">
      <div className="admin-top-bar-start">
        <Link href="/admin" className="button-link admin-dashboard-btn">
          Main Dashboard
        </Link>
        <span className="muted admin-top-bar-label">Admin Portal</span>
      </div>
      <div className="admin-top-bar-end">
        <p className="admin-top-bar-user">
          <strong>{fullName}</strong>
          <span className="muted"> · EMP ID: {employeeId ?? "N/A"}</span>
        </p>
        <form action={logoutAction}>
          <button type="submit" className="button-muted">
            Logout
          </button>
        </form>
      </div>
    </header>
  );
}
