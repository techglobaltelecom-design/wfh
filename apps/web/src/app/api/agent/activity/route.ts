import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { validateAgentToken } from "../_auth";
import { z } from "zod";

const schema = z.object({
  employeeId: z.string().min(3),
  activeSeconds: z.number().min(0),
  idleSeconds: z.number().min(0),
  capturedAt: z.string().datetime()
});

export async function POST(request: Request) {
  const authError = validateAgentToken(request);
  if (authError) return authError;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);

  const activity = await prisma.activityEvent.create({
    data: {
      userId: parsed.data.employeeId,
      activeSeconds: parsed.data.activeSeconds,
      idleSeconds: parsed.data.idleSeconds,
      capturedAt: new Date(parsed.data.capturedAt)
    }
  });
  return ok(activity);
}
