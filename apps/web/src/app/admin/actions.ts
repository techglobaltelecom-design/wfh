"use server";

import { LeaveStatus } from "@prisma/client";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { approveLeave } from "@/server/services/employeeService";
import { generatePayrollForPeriod } from "@/server/payroll/calculate";
import { writeAuditLog } from "@/server/audit/log";

export async function decideLeaveAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const leaveId = String(formData.get("leaveId"));
  const status = String(formData.get("status")) as LeaveStatus;
  const note = String(formData.get("decisionNote") ?? "");

  await approveLeave(leaveId, admin.id, status, note);
  await writeAuditLog({
    actorId: admin.id,
    action: "LEAVE_DECISION",
    targetType: "LeaveRequest",
    targetId: leaveId,
    metadata: { status, note }
  });
  revalidatePath("/admin");
}

export async function generatePayrollAction(formData: FormData) {
  const admin = await requireRole("ADMIN");
  const periodStart = new Date(String(formData.get("periodStart")));
  const periodEnd = new Date(String(formData.get("periodEnd")));
  await generatePayrollForPeriod(periodStart, periodEnd);
  await writeAuditLog({
    actorId: admin.id,
    action: "PAYROLL_RECALCULATED",
    targetType: "PayrollEntry",
    metadata: { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
  });
  revalidatePath("/admin");
}
