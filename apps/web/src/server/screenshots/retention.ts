import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { getStorageRootDir } from "@/lib/storage";
import { businessDayRangeForDateInput, businessDateInputDaysBefore } from "@/lib/timezone";

/** Today + yesterday stay visible; older screenshots are removed on prune. */
const SCREENSHOT_RETENTION_DAYS = 2;

export async function pruneOldScreenshots() {
  const oldestKeptDate = businessDateInputDaysBefore(SCREENSHOT_RETENTION_DAYS - 1);
  const { start: cutoff } = businessDayRangeForDateInput(oldestKeptDate);
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
