"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PresenceItem {
  id: string;
  fullName: string;
  employeeId: string | null;
  status: "ONLINE" | "AWAY" | "BUSY";
  statusAt: string | null;
}

interface PresenceResponse {
  ok: boolean;
  error?: string;
  data?: {
    activeNow: number;
    employeePresence: PresenceItem[];
  };
}

export function AdminPresenceBoard({
  initialActiveNow,
  initialPresence
}: {
  initialActiveNow: number;
  initialPresence: PresenceItem[];
}) {
  const [activeNow, setActiveNow] = useState(initialActiveNow);
  const [presence, setPresence] = useState(initialPresence);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/admin/presence", { cache: "no-store" });
        const payload = (await response.json()) as PresenceResponse;
        if (response.ok && payload.ok && payload.data) {
          setActiveNow(payload.data.activeNow);
          setPresence(payload.data.employeePresence);
          setLastUpdated(new Date());
        }
      } catch {
        // Keep previous state on transient network failure.
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  async function removeEmployee(employeeId: string, employeeName: string) {
    const confirmed = window.confirm(
      `Delete ${employeeName}? This removes employee login and related records.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/employees/${employeeId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { ok: boolean; error?: string; data?: { message?: string } };
      if (!response.ok || !payload.ok) {
        setNotice({ type: "error", message: payload.error ?? "Failed to delete employee." });
        return;
      }

      const wasOnline = presence.find((row) => row.id === employeeId)?.status === "ONLINE";
      setPresence((prev) => prev.filter((row) => row.id !== employeeId));
      setActiveNow((prev) => Math.max(0, prev - (wasOnline ? 1 : 0)));
      setNotice({
        type: "success",
        message: payload.data?.message ?? "Employee deleted successfully."
      });
    } catch {
      setNotice({ type: "error", message: "Network error while deleting employee." });
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">Live Employee Presence</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>
        Online now: {activeNow} | Last updated: {lastUpdated.toLocaleTimeString()}
      </p>
      <div className="employee-list">
        {presence.map((employee) => (
          <article key={employee.id} className="presence-row">
            <div>
              <p style={{ margin: 0 }}>
                <strong>{employee.fullName}</strong>
              </p>
              <p className="muted" style={{ margin: 0 }}>
                EMP ID: {employee.employeeId ?? "N/A"}
              </p>
            </div>
            <div className="row-wrap">
              <span className={`status-badge ${employee.status === "ONLINE" ? "is-online" : "is-away"}`}>
                {employee.status === "BUSY" ? "ONLINE" : employee.status}
              </span>
              <Link href={`/admin/screenshots?employeeId=${employee.id}`} className="button-link">
                View Screenshots
              </Link>
              <button
                type="button"
                className="button-danger"
                onClick={() => removeEmployee(employee.id, employee.fullName)}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      {notice && (
        <p className={notice.type === "success" ? "notice notice-success" : "notice notice-error"}>
          {notice.message}
        </p>
      )}
    </section>
  );
}
