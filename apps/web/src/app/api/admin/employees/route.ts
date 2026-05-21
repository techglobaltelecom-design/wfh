import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { writeAuditLog } from "@/server/audit/log";

const schema = z.object({
  fullName: z.string().min(2),
  employeeId: z.string().min(2),
  activationCode: z.string().min(4),
  email: z.string().email().optional()
});

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, fullName: true, employeeId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return ok(employees);
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input.");
  const input = parsed.data;
  const normalizedEmployeeId = input.employeeId.trim();
  const fallbackEmail = `${normalizedEmployeeId}@internal.local`;
  const email = input.email?.trim() || fallbackEmail;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ employeeId: normalizedEmployeeId }, { email }]
    }
  });
  if (existing) return fail("Employee ID or email already exists.");

  const activationCodeHash = await bcrypt.hash(input.activationCode, 10);
  const passwordHash = await bcrypt.hash(randomUUID(), 10);

  const employee = await prisma.user.create({
    data: {
      fullName: input.fullName.trim(),
      employeeId: normalizedEmployeeId,
      email,
      passwordHash,
      activationCodeHash,
      requiresActivation: true,
      role: "EMPLOYEE"
    },
    select: { id: true, fullName: true, employeeId: true }
  });

  await writeAuditLog({
    actorId: session.id,
    action: "EMPLOYEE_CREATED",
    targetType: "User",
    targetId: employee.id,
    metadata: { employeeId: employee.employeeId, fullName: employee.fullName }
  });

  return ok({
    message: "Employee added successfully. Share employee ID and activation code with the employee.",
    employee
  });
}
