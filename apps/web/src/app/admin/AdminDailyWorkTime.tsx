"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EmployeeDailyWorkTime,
  formatWorkDuration,
  resolveLiveWorkSeconds
} from "@/lib/workTime";

interface DailyWorkTimeResponse {
  ok: boolean;
  error?: string;
  data?: {
    date: string;
    rows: EmployeeDailyWorkTime[];
  };
}

function formatClockTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AdminDailyWorkTime({
  initialDate,
  initialRows
}: {
  initialDate: string;
  initialRows: EmployeeDailyWorkTime[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [rows, setRows] = useState(initialRows);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  const isToday = selectedDate === initialDate;

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/admin/daily-work-time?date=${encodeURIComponent(selectedDate)}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as DailyWorkTimeResponse;
        if (!cancelled && response.ok && payload.ok && payload.data) {
          setRows(payload.data.rows);
        }
      } catch {
        // Keep previous rows on transient network failure.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRows();
    const timer = setInterval(() => {
      void loadRows();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedDate]);

  const displayRows = useMemo(
    () =>
      rows.map((row) => {
        const live = isToday ? resolveLiveWorkSeconds(row, nowMs) : row;
        return {
          ...row,
          workSeconds: live.workSeconds,
          breakSeconds: live.breakSeconds
        };
      }),
    [rows, isToday, nowMs]
  );

  const totalWorkSeconds = displayRows.reduce((acc, row) => acc + row.workSeconds, 0);

  return (
    <section className="card">
      <div className="admin-section-header">
        <div>
          <h2 className="section-title">Daily Work Time</h2>
          <p className="muted" style={{ marginTop: -6, marginBottom: 0 }}>
            Work time per employee for the selected day (clock-in to clock-out minus breaks).
          </p>
        </div>
        <label className="admin-date-filter">
          <span className="muted">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
      </div>

      <p className="muted" style={{ marginTop: 10 }}>
        Team total: {formatWorkDuration(totalWorkSeconds)}
        {loading ? " · Updating..." : isToday ? " · Live" : ""}
      </p>

      <div className="work-time-table-wrap">
        <table className="work-time-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>EMP ID</th>
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Work Time</th>
              <th>Break</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={7}>No employees found.</td>
              </tr>
            )}
            {displayRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.fullName}</strong>
                </td>
                <td>{row.employeeId ?? "N/A"}</td>
                <td>{formatClockTime(row.markedInAt)}</td>
                <td>{row.clockedIn ? "—" : formatClockTime(row.markedOutAt)}</td>
                <td className="work-time-value">{formatWorkDuration(row.workSeconds)}</td>
                <td>{formatWorkDuration(row.breakSeconds)}</td>
                <td>
                  <span className={`status-badge ${row.clockedIn ? "is-online" : "is-away"}`}>
                    {row.clockedIn ? "CLOCKED IN" : row.markedInAt ? "CLOCKED OUT" : "NOT STARTED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
