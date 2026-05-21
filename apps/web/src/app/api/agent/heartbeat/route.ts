import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { validateAgentToken } from "../_auth";
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

  const status = await prisma.workStatusEvent.create({
    data: { userId: parsed.data.employeeId, status: parsed.data.status, at: new Date(parsed.data.sentAt) }
  });
  return ok(status);
}
