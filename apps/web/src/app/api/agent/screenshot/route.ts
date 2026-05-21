import { storeBase64Screenshot } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/server/http";
import { pruneOldScreenshots } from "@/server/screenshots/retention";
import { validateAgentToken } from "../_auth";
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

  const storageKey = await storeBase64Screenshot(
    `${Date.now()}-${parsed.data.filename}`,
    parsed.data.imageBase64
  );

  const screenshot = await prisma.screenshot.create({
    data: {
      userId: parsed.data.employeeId,
      storageKey,
      capturedAt: new Date(parsed.data.capturedAt)
    }
  });
  return ok(screenshot);
}
