import { requireRole } from "@/lib/rbac";
import { AdminTopBar } from "./AdminTopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");

  return (
    <>
      <div className="container admin-layout-bar">
        <AdminTopBar fullName={session.fullName} employeeId={session.employeeId} />
      </div>
      {children}
    </>
  );
}
