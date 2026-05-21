import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signStorageKey } from "@/lib/storage";
import { dayBoundsForDateInput, formatDateInput } from "@/lib/timezone";
import { fail, ok } from "@/server/http";
import { pruneOldScreenshots } from "@/server/screenshots/retention";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  await pruneOldScreenshots();

  const dateParam = new URL(request.url).searchParams.get("date");
  const selected = dateParam ?? formatDateInput();
  const { start, end } = dayBoundsForDateInput(selected);

  const screenshots = await prisma.screenshot.findMany({
    where: {
      capturedAt: {
        gte: start,
        lte: end
      }
    },
    include: { user: { select: { fullName: true, employeeId: true } } },
    orderBy: { capturedAt: "asc" }
  });

  const records = screenshots.map((shot) => ({
    id: shot.id,
    employee: shot.user.fullName,
    employeeId: shot.user.employeeId,
    capturedAt: shot.capturedAt,
    viewUrl: `/api/admin/screenshots/${shot.id}?sig=${signStorageKey(shot.storageKey)}`
  }));

  return ok(records);
}
