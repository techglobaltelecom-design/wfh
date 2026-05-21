import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { attendanceRecords } from "@/server/services/adminService";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const records = await attendanceRecords();
  return ok(records);
}
