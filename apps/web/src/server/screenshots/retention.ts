import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { getStorageRootDir } from "@/lib/storage";

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function pruneOldScreenshots() {
  const cutoff = startOfTodayLocal();
  const stale = await prisma.screenshot.findMany({
    where: { capturedAt: { lt: cutoff } },
    select: { id: true, storageKey: true }
  });

  await Promise.all(
    stale.map(async (shot) => {
      try {
        await unlink(join(getStorageRootDir(), shot.storageKey));
      } catch {
        // Continue pruning even if a file is already gone.
      }
    })
  );

  if (stale.length > 0) {
    await prisma.screenshot.deleteMany({
      where: { id: { in: stale.map((shot) => shot.id) } }
    });
  }
}
