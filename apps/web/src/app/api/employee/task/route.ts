import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { addTaskUpdate } from "@/server/services/employeeService";
import { z } from "zod";

const schema = z.object({
  summary: z.string().min(5),
  blockers: z.string().optional(),
  progressPct: z.number().min(0).max(100)
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "EMPLOYEE") return fail("Unauthorized", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);
  const task = await addTaskUpdate(session.id, parsed.data);
  return ok(task);
}
