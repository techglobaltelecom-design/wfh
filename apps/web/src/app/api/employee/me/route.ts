import { getSessionUser } from "@/lib/auth";
import { employeeSnapshot } from "@/server/services/employeeService";
import { fail, ok } from "@/server/http";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "EMPLOYEE") return fail("Unauthorized", 401);
  const data = await employeeSnapshot(session.id);
  return ok(data);
}
