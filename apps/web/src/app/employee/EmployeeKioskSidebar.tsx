"use client";

import { useEffect, useMemo, useState } from "react";

interface EmployeeKioskSidebarProps {
  fullName: string;
  employeeId?: string;
  presenceStatus: "ONLINE" | "AWAY";
  weekGrossClosedSeconds: number;
  weekBreakClosedSeconds: number;
  attendanceEntries: number;
  activeAttendanceStartedAtMs: number | null;
  breakStartedAtMs: number | null;
  dayGrossClosedSeconds: number;
  dayBreakClosedSeconds: number;
}

function toClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function EmployeeKioskSidebar(props: EmployeeKioskSidebarProps) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeAttendanceSeconds = useMemo(() => {
    if (!props.activeAttendanceStartedAtMs) return 0;
    return Math.max(0, Math.floor((nowMs - props.activeAttendanceStartedAtMs) / 1000));
  }, [props.activeAttendanceStartedAtMs, nowMs]);

  const activeBreakSeconds = useMemo(() => {
    if (!props.breakStartedAtMs) return 0;
    return Math.max(0, Math.floor((nowMs - props.breakStartedAtMs) / 1000));
  }, [props.breakStartedAtMs, nowMs]);

  const dayBreakTotalSeconds = useMemo(
    () => props.dayBreakClosedSeconds + activeBreakSeconds,
    [props.dayBreakClosedSeconds, activeBreakSeconds]
  );

  const dayGrossSeconds = useMemo(
    () => props.dayGrossClosedSeconds + activeAttendanceSeconds,
    [props.dayGrossClosedSeconds, activeAttendanceSeconds]
  );
  const dayWorkSeconds = useMemo(
    () => Math.max(0, dayGrossSeconds - dayBreakTotalSeconds),
    [dayGrossSeconds, dayBreakTotalSeconds]
  );

  const weekBreakTotalSeconds = useMemo(
    () => props.weekBreakClosedSeconds + activeBreakSeconds,
    [props.weekBreakClosedSeconds, activeBreakSeconds]
  );
  const weekGrossSeconds = useMemo(
    () => props.weekGrossClosedSeconds + activeAttendanceSeconds,
    [props.weekGrossClosedSeconds, activeAttendanceSeconds]
  );
  const weekWorkSeconds = useMemo(
    () => Math.max(0, weekGrossSeconds - weekBreakTotalSeconds),
    [weekGrossSeconds, weekBreakTotalSeconds]
  );

  return (
    <>
      <h1 className="page-title">Employee Workspace</h1>
      <p style={{ marginTop: 6 }}>
        <strong>{props.fullName}</strong>
      </p>
      <p className="muted" style={{ marginTop: 0 }}>
        EMP ID: {props.employeeId ?? "N/A"}
      </p>
      <div className="kiosk-stats">
        <div className="kiosk-stat-block">
          <p className="muted">Day Total</p>
          <p className="kiosk-time">{toClock(dayWorkSeconds)}</p>
          <p className="muted">
            Work {toClock(dayWorkSeconds)} / Break {toClock(dayBreakTotalSeconds)}
          </p>
        </div>
        <div className="kiosk-stat-block">
          <p className="muted">Week Total</p>
          <p className="kiosk-time">{toClock(weekWorkSeconds)}</p>
          <p className="muted">Attendance Entries {props.attendanceEntries}</p>
        </div>
        <div className="kiosk-stat-block">
          <p className="muted">Presence</p>
          <span className={`status-badge ${props.presenceStatus === "ONLINE" ? "is-online" : "is-away"}`}>
            {props.presenceStatus}
          </span>
        </div>
      </div>
    </>
  );
}
