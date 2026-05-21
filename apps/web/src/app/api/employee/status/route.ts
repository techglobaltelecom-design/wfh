import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { updateWorkStatus } from "@/server/services/employeeService";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["ONLINE", "AWAY"])
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "EMPLOYEE") return fail("Unauthorized", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);
  const status = await updateWorkStatus(session.id, parsed.data.status);
  return ok(status);
}
