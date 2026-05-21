import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { employeeReports } from "@/server/services/adminService";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const reports = await employeeReports();
  return ok(reports);
}
