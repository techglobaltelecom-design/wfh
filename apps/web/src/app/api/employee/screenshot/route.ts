import { getSessionUser } from "@/lib/auth";
import { storeBase64Screenshot } from "@/lib/storage";
import { fail, ok } from "@/server/http";
import { pruneOldScreenshots } from "@/server/screenshots/retention";
import { uploadScreenshotRecord } from "@/server/services/employeeService";
import { z } from "zod";

const schema = z.object({
  filename: z.string().min(3),
  imageBase64: z.string().min(20)
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "EMPLOYEE") return fail("Unauthorized", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return fail(parsed.error.message);
  await pruneOldScreenshots();

  const storageKey = await storeBase64Screenshot(
    `${Date.now()}-${parsed.data.filename}`,
    parsed.data.imageBase64
  );
  const screenshot = await uploadScreenshotRecord(session.id, storageKey);
  return ok(screenshot);
}
