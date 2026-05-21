"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface EmployeeAccount {
  id: string;
  fullName: string;
  employeeId: string | null;
  requiresActivation: boolean;
}

interface EmployeesResponse {
  ok: boolean;
  data?: EmployeeAccount[];
  error?: string;
}

interface ActionResponse {
  ok: boolean;
  error?: string;
  data?: { message?: string };
}

export function AdminEmployeeAccountsCard() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    void loadEmployees();
  }, []);

  async function loadEmployees() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/employees", { cache: "no-store" });
      const payload = (await response.json()) as EmployeesResponse;
      if (response.ok && payload.ok && payload.data) {
        setEmployees(payload.data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function setEmployeePassword(employee: EmployeeAccount, password: string) {
    setPendingId(employee.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/employees/${employee.id}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const payload = (await response.json()) as ActionResponse;
      if (!response.ok || !payload.ok) {
        setNotice({ type: "error", message: payload.error ?? "Failed to set password." });
        return;
      }
      setNotice({
        type: "success",
        message:
          payload.data?.message ??
          `${employee.fullName} can now login with Employee ID ${employee.employeeId}.`
      });
      await loadEmployees();
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Network error. Try again." });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">Employee Accounts</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>
        Use Employee ID for login. If activation fails, set a password here to enable login
        immediately.
      </p>
      {loading && <p>Loading employees...</p>}
      {!loading && employees.length === 0 && <p>No employees yet.</p>}
      {employees.map((employee) => (
        <EmployeePasswordRow
          key={employee.id}
          employee={employee}
          pending={pendingId === employee.id}
          onSubmit={setEmployeePassword}
        />
      ))}
      {notice && (
        <p className={notice.type === "success" ? "notice notice-success" : "notice notice-error"}>
          {notice.message}
        </p>
      )}
    </section>
  );
}

function EmployeePasswordRow({
  employee,
  pending,
  onSubmit
}: {
  employee: EmployeeAccount;
  pending: boolean;
  onSubmit: (employee: EmployeeAccount, password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");

  return (
    <form
      className="card"
      style={{ marginBottom: 8 }}
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(employee, password);
      }}
    >
      <p style={{ marginTop: 0 }}>
        <strong>{employee.fullName}</strong>
      </p>
      <p className="muted" style={{ marginTop: 0 }}>
        Login ID: <strong>{employee.employeeId ?? "N/A"}</strong> | Status:{" "}
        {employee.requiresActivation ? "Needs activation" : "Ready to login"}
      </p>
      <div className="row-wrap">
        <input
          type="password"
          minLength={8}
          placeholder="Set login password (min 8 chars)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Enable Login"}
        </button>
      </div>
    </form>
  );
}
