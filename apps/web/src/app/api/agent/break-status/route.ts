import { fail, ok } from "@/server/http";
import { isEmployeeOnBreak } from "@/server/services/employeeService";
import { validateAgentToken } from "../_auth";
import { resolveAgentUserId } from "../_resolveUser";

export async function GET(request: Request) {
  const authError = validateAgentToken(request);
  if (authError) return authError;

  const employeeId = new URL(request.url).searchParams.get("employeeId")?.trim();
  if (!employeeId) return fail("employeeId is required");

  const userId = await resolveAgentUserId(employeeId);
  if (!userId) return fail("Unknown employee ID", 404);

  const onBreak = await isEmployeeOnBreak(userId);
  return ok({ onBreak });
}
