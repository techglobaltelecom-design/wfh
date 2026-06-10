import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { getStorageRootDir } from "@/lib/storage";
import { businessDayRangeForDateInput, formatDateInput } from "@/lib/timezone";

function currentMonthStart() {
  const today = formatDateInput();
  const monthStartDate = `${today.slice(0, 7)}-01`;
  return businessDayRangeForDateInput(monthStartDate).start;
}

export async function pruneOldScreenshots() {
  const cutoff = currentMonthStart();
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
