"use server";

import { requireRole } from "@/lib/rbac";
import {
  addTaskUpdate,
  endBreak,
  endWork,
  markAttendanceIn,
  markAttendanceOut,
  requestLeave,
  startBreak,
  startWork,
  updateWorkStatus
} from "@/server/services/employeeService";
import { revalidatePath } from "next/cache";

async function withEmployee<T>(handler: (employeeId: string) => Promise<T>) {
  const session = await requireRole("EMPLOYEE");
  await handler(session.id);
  revalidatePath("/employee");
}

export async function runEmployeeAction(formData: FormData) {
  const action = String(formData.get("action"));
  await withEmployee(async (employeeId) => {
    try {
      if (action === "MARK_IN") await markAttendanceIn(employeeId);
      else if (action === "MARK_OUT") await markAttendanceOut(employeeId);
      else if (action === "START_WORK") await startWork(employeeId);
      else if (action === "END_WORK") await endWork(employeeId);
      else if (action === "START_BREAK") await startBreak(employeeId);
      else if (action === "END_BREAK") await endBreak(employeeId);
    } catch {
      // Keep employee actions non-breaking in UI; invalid sequence is treated as no-op.
    }
  });
}

export async function submitTaskUpdate(formData: FormData) {
  await withEmployee(async (employeeId) => {
    try {
      await addTaskUpdate(employeeId, {
        summary: String(formData.get("summary") ?? ""),
        blockers: String(formData.get("blockers") ?? ""),
        progressPct: Number(formData.get("progressPct") ?? 0)
      });
    } catch {
      // Prevent full-page runtime errors for malformed form submissions.
    }
  });
}

export async function submitLeaveRequest(formData: FormData) {
  await withEmployee(async (employeeId) => {
    try {
      await requestLeave(employeeId, {
        fromDate: String(formData.get("fromDate")) + "T00:00:00.000Z",
        toDate: String(formData.get("toDate")) + "T00:00:00.000Z",
        reason: String(formData.get("reason") ?? "")
      });
    } catch {
      // Prevent full-page runtime errors for malformed form submissions.
    }
  });
}

export async function changeStatus(formData: FormData) {
  await withEmployee(async (employeeId) => {
    try {
      const status = String(formData.get("status")) as "ONLINE" | "AWAY";
      await updateWorkStatus(employeeId, status);
    } catch {
      // Prevent full-page runtime errors for malformed form submissions.
    }
  });
}
