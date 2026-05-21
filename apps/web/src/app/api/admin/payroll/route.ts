import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { generatePayrollForPeriod } from "@/server/payroll/calculate";
import { z } from "zod";

const schema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime()
});

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const rows = await prisma.payrollEntry.findMany({
    include: { user: { select: { fullName: true, employeeId: true } } },
    orderBy: { generatedAt: "desc" },
    take: 100
  });
  return ok(rows);
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);
  const payroll = await generatePayrollForPeriod(
    new Date(parsed.data.periodStart),
    new Date(parsed.data.periodEnd)
  );
  return ok(payroll);
}
