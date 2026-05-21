import { prisma } from "@/lib/db";
import { employeeIdCandidates } from "@/lib/employeeId";

export async function resolveAgentUserId(employeeRef: string) {
  const candidates = employeeIdCandidates(employeeRef);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...candidates.map((employeeId) => ({ employeeId })),
        { id: employeeRef.trim() }
      ]
    },
    select: { id: true, employeeId: true }
  });

  return user?.id ?? null;
}
