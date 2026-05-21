import { prisma } from "@/lib/db";

export async function resolveAgentUserId(employeeRef: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ employeeId: employeeRef }, { id: employeeRef }]
    },
    select: { id: true }
  });

  return user?.id ?? null;
}
