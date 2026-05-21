import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { getEmployeePresenceSnapshot } from "@/server/services/adminService";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const snapshot = await getEmployeePresenceSnapshot();
  return ok(snapshot);
}
