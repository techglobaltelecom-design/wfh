import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { writeAuditLog } from "@/server/audit/log";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ employeeUserId: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const { employeeUserId } = await params;

  const employee = await prisma.user.findUnique({
    where: { id: employeeUserId },
    select: { id: true, role: true, fullName: true, employeeId: true }
  });
  if (!employee || employee.role !== "EMPLOYEE") return fail("Employee not found.", 404);

  await prisma.user.delete({ where: { id: employeeUserId } });
  await writeAuditLog({
    actorId: session.id,
    action: "EMPLOYEE_DELETED",
    targetType: "User",
    targetId: employeeUserId,
    metadata: { fullName: employee.fullName, employeeId: employee.employeeId }
  });

  return ok({ message: "Employee deleted successfully." });
}
