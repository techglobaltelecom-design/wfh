import { storeBase64Screenshot } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { pruneOldScreenshots } from "@/server/screenshots/retention";
import { validateAgentToken } from "../_auth";
import { resolveAgentUserId } from "../_resolveUser";
import { z } from "zod";

const schema = z.object({
  employeeId: z.string().min(3),
  filename: z.string().min(3),
  imageBase64: z.string().min(20),
  capturedAt: z.string().datetime()
});

export async function POST(request: Request) {
  const authError = validateAgentToken(request);
  if (authError) return authError;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);
  await pruneOldScreenshots();

  const userId = await resolveAgentUserId(parsed.data.employeeId);
  if (!userId) return fail("Unknown employee ID", 404);

  const storageKey = await storeBase64Screenshot(
    `${Date.now()}-${parsed.data.filename}`,
    parsed.data.imageBase64
  );

  const screenshot = await prisma.screenshot.create({
    data: {
      userId,
      storageKey,
      capturedAt: new Date(parsed.data.capturedAt)
    }
  });
  return ok(screenshot);
}
