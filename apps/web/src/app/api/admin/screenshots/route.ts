import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signStorageKey } from "@/lib/storage";
import { fail, ok } from "@/server/http";
import { pruneOldScreenshots } from "@/server/screenshots/retention";

function dayWindow(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return { start, end };
}

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return fail("Unauthorized", 401);
  await pruneOldScreenshots();

  const dateParam = new URL(request.url).searchParams.get("date");
  const selected = dateParam ? new Date(dateParam) : new Date();
  const { start, end } = dayWindow(selected);

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
