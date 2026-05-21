import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { requestLeave } from "@/server/services/employeeService";
import { z } from "zod";

const schema = z.object({
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  reason: z.string().min(5)
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "EMPLOYEE") return fail("Unauthorized", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);
  const leave = await requestLeave(session.id, parsed.data);
  return ok(leave);
}
