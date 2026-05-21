import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { employeeReports } from "@/server/services/adminService";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const reports = await employeeReports();

  const ranking = [...reports].sort((a, b) => {
    const scoreA = a.avgTaskProgress + a.totalHours;
    const scoreB = b.avgTaskProgress + b.totalHours;
    return scoreB - scoreA;
  });

  return ok(ranking);
}
