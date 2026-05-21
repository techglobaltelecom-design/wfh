"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const defaultActionButtons = [
  { action: "MARK_IN", label: "Mark Attendance In", className: "" },
  { action: "MARK_OUT", label: "Mark Attendance Out", className: "" },
  { action: "START_BREAK", label: "Start Break", className: "" },
  { action: "END_BREAK", label: "End Break", className: "" }
] as const;

const kioskActionButtons = [
  { action: "MARK_IN", label: "Clock In", className: "kiosk-clock-in" },
  { action: "MARK_OUT", label: "Clock Out", className: "kiosk-clock-out" },
  { action: "START_BREAK", label: "Start Break", className: "kiosk-start-break" },
  { action: "END_BREAK", label: "End Break", className: "kiosk-end-break" }
] as const;

type EmployeeAction = (typeof defaultActionButtons)[number]["action"];

interface ActionResponse {
  ok: boolean;
  error?: string;
  data?: { message?: string };
}

export function QuickActionsPanel({ variant = "default" }: { variant?: "default" | "kiosk" }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<EmployeeAction | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const actionButtons = variant === "kiosk" ? kioskActionButtons : defaultActionButtons;

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  async function runAction(action: EmployeeAction, label: string) {
    setPendingAction(action);
    setNotice(null);

    try {
      const response = await fetch("/api/employee/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = (await response.json()) as ActionResponse;

      if (!response.ok || !payload.ok) {
        setNotice({
          type: "error",
          message: payload.error ?? `${label} failed.`
        });
        return;
      }

      setNotice({
        type: "success",
        message: payload.data?.message ?? `${label} completed.`
      });
      router.refresh();
    } catch {
      setNotice({
        type: "error",
        message: "Network error. Please try again."
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <>
      <h2 className="section-title">Quick Actions</h2>
      <div className={variant === "kiosk" ? "kiosk-actions-grid" : "action-grid"}>
        {actionButtons.map((item) => (
          <button
            key={item.action}
            type="button"
            onClick={() => runAction(item.action, item.label)}
            disabled={pendingAction !== null}
            className={variant === "kiosk" ? `kiosk-action ${item.className}` : undefined}
          >
            {pendingAction === item.action ? "Processing..." : item.label}
          </button>
        ))}
      </div>
      {notice && (
        <p className={notice.type === "success" ? "notice notice-success" : "notice notice-error"}>
          {notice.message}
        </p>
      )}
    </>
  );
}
