import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorageRootDir, verifySignedStorageKey } from "@/lib/storage";
import { fail } from "@/server/http";
import { writeAuditLog } from "@/server/audit/log";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ screenshotId: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);

  const { screenshotId } = await params;
  const record = await prisma.screenshot.findUnique({ where: { id: screenshotId } });
  if (!record) return fail("Not found", 404);

  const url = new URL(request.url);
  const signature = url.searchParams.get("sig");
  if (!signature || !verifySignedStorageKey(record.storageKey, signature)) {
    return fail("Invalid signature", 403);
  }

  await writeAuditLog({
    actorId: session.id,
    action: "SCREENSHOT_VIEWED",
    targetType: "Screenshot",
    targetId: screenshotId
  });

  const abs = join(getStorageRootDir(), record.storageKey);
  const content = await readFile(abs);
  return new NextResponse(content, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=60"
    }
  });
}
