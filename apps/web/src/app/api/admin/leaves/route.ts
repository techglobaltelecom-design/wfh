import { LeaveStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import { approveLeave, listPendingLeaves } from "@/server/services/employeeService";
import { z } from "zod";

const decisionSchema = z.object({
  leaveId: z.string().min(3),
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
  decisionNote: z.string().optional()
});

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const leaves = await listPendingLeaves();
  return ok(leaves);
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const parsed = decisionSchema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);
  const leave = await approveLeave(
    parsed.data.leaveId,
    session.id,
    parsed.data.status,
    parsed.data.decisionNote
  );
  return ok(leave);
}
