import { getSessionUser } from "@/lib/auth";
import { formatDateInput } from "@/lib/timezone";
import { fail, ok } from "@/server/http";
import { getEmployeesDailyWorkTime } from "@/server/services/adminService";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);

  const date = new URL(request.url).searchParams.get("date") ?? formatDateInput();
  const rows = await getEmployeesDailyWorkTime(date);

  return ok({ date, rows });
}
