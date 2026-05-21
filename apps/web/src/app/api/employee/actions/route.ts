import { getSessionUser } from "@/lib/auth";
import { fail, ok } from "@/server/http";
import {
  endBreak,
  markAttendanceIn,
  markAttendanceOut,
  startBreak,
  updateWorkStatus
} from "@/server/services/employeeService";

const actionMap = {
  MARK_IN: markAttendanceIn,
  MARK_OUT: markAttendanceOut,
  START_BREAK: startBreak,
  END_BREAK: endBreak
} as const;

type EmployeeAction = keyof typeof actionMap;
const successMessages: Record<EmployeeAction, string> = {
  MARK_IN: "Attendance marked in successfully.",
  MARK_OUT: "Attendance marked out successfully.",
  START_BREAK: "Break started successfully.",
  END_BREAK: "Break ended successfully."
};

const noopMessages: Record<EmployeeAction, string> = {
  MARK_IN: "Today's attendance is already completed. Clock-in is allowed once per day.",
  MARK_OUT: "No active attendance session for today, or clock-out already done.",
  START_BREAK: "No active clock-in session or break is already active.",
  END_BREAK: "No active break to end."
};

const statusByAction: Partial<Record<EmployeeAction, "ONLINE" | "AWAY">> = {
  MARK_IN: "ONLINE",
  MARK_OUT: "AWAY",
  START_BREAK: "AWAY",
  END_BREAK: "ONLINE"
};

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "EMPLOYEE") return fail("Unauthorized", 401);

  const body = (await request.json()) as { action?: EmployeeAction };
  if (!body.action || !(body.action in actionMap)) {
    return fail("Unknown action");
  }
  if (body.action === "MARK_IN" && new Date().getDay() === 0) {
    return ok({ performed: false, message: "Clock-in is not allowed on Sunday (holiday)." });
  }

  try {
    const handler = actionMap[body.action];
    const data = await handler(session.id);
    const nextStatus = statusByAction[body.action];
    if (nextStatus && data !== null) {
      await updateWorkStatus(session.id, nextStatus);
    }
    if (data === null) {
      return ok({ performed: false, message: noopMessages[body.action] });
    }
    return ok({ performed: true, message: successMessages[body.action], data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    return fail(message);
  }
}
