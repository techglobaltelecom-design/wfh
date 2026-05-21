import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { writeAuditLog } from "@/server/audit/log";

const schema = z.object({
  password: z.string().min(8)
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeUserId: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);

  const { employeeUserId } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail("Password must be at least 8 characters.");

  const employee = await prisma.user.findUnique({
    where: { id: employeeUserId },
    select: { id: true, role: true, fullName: true, employeeId: true }
  });
  if (!employee || employee.role !== "EMPLOYEE") return fail("Employee not found.", 404);

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: employee.id },
    data: {
      passwordHash,
      requiresActivation: false,
      activationCodeHash: null
    }
  });

  await writeAuditLog({
    actorId: session.id,
    action: "EMPLOYEE_PASSWORD_SET",
    targetType: "User",
    targetId: employee.id,
    metadata: { employeeId: employee.employeeId, fullName: employee.fullName }
  });

  return ok({
    message: `Login enabled for ${employee.fullName}. Employee ID: ${employee.employeeId}`
  });
}
