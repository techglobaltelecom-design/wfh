import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { resolvePresenceStatus } from "@/server/services/employeeService";
import { validateAgentToken } from "../_auth";
import { resolveAgentUserId } from "../_resolveUser";
import { z } from "zod";

const schema = z.object({
  employeeId: z.string().min(3),
  status: z.enum(["ONLINE", "BUSY", "AWAY"]),
  idleSeconds: z.number().min(0),
  sentAt: z.string().datetime()
});

export async function POST(request: Request) {
  const authError = validateAgentToken(request);
  if (authError) return authError;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);

  const userId = await resolveAgentUserId(parsed.data.employeeId);
  if (!userId) return fail("Unknown employee ID", 404);

  const status = await resolvePresenceStatus(userId, parsed.data.status);
  const event = await prisma.workStatusEvent.create({
    data: { userId, status, at: new Date(parsed.data.sentAt) }
  });
  return ok(event);
}
