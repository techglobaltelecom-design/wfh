import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { writeAuditLog } from "@/server/audit/log";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "New password and confirm password must match."
  });

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request.");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return fail("Admin account not found.", 404);

  const validCurrent = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!validCurrent) return fail("Current password is incorrect.", 400);

  const sameAsOld = await bcrypt.compare(parsed.data.newPassword, user.passwordHash);
  if (sameAsOld) return fail("New password must be different from current password.", 400);

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash }
  });

  await writeAuditLog({
    actorId: user.id,
    action: "ADMIN_PASSWORD_CHANGED",
    targetType: "User",
    targetId: user.id
  });

  return ok({ message: "Password updated successfully." });
}
