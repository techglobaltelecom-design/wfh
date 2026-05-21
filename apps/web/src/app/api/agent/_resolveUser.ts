import { prisma } from "@/lib/db";
import { normalizeEmployeeId } from "@/lib/employeeId";

export async function resolveAgentUserId(employeeRef: string) {
  const normalizedEmployeeId = normalizeEmployeeId(employeeRef);
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ employeeId: normalizedEmployeeId }, { id: employeeRef.trim() }]
    },
    select: { id: true }
  });

  return user?.id ?? null;
}
