import { generatePayrollForPeriod } from "@/server/payroll/calculate";
import { prisma } from "@/lib/db";
import { pruneOldScreenshots } from "@/server/screenshots/retention";

const DAY_MS = 24 * 60 * 60 * 1000;
let schedulerStarted = false;

export function startScheduler() {
  // Daily rollup summary every 24 hours.
  setInterval(async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - DAY_MS);
    await prisma.activityEvent.count({
      where: { capturedAt: { gte: yesterday, lte: now } }
    });
  }, DAY_MS);

  // Weekly payroll projection.
  setInterval(async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * DAY_MS);
    await generatePayrollForPeriod(start, end);
  }, 7 * DAY_MS);

  // Keep screenshots for one day so admin can review full-day timeline.
  setInterval(async () => {
    await pruneOldScreenshots();
  }, DAY_MS);
}

export function ensureSchedulerStarted() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  startScheduler();
}
