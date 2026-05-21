"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AddEmployeeResponse {
  ok: boolean;
  error?: string;
  data?: { message?: string };
}

export function AdminAddEmployeeCard() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      employeeId: String(formData.get("employeeId") ?? ""),
      activationCode: String(formData.get("activationCode") ?? "")
    };

    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as AddEmployeeResponse;
      if (!response.ok || !result.ok) {
        setNotice({ type: "error", message: result.error ?? "Failed to add employee." });
        return;
      }

      setNotice({
        type: "success",
        message: result.data?.message ?? "Employee added successfully."
      });
      form.reset();
      router.refresh();
    } catch {
      setNotice({ type: "error", message: "Network error. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">Add Employee</h2>
      <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>
        Create employee and share EMP ID + activation code for first-time sign-in.
      </p>
      <form className="grid" style={{ maxWidth: 560 }} onSubmit={onSubmit}>
        <input name="fullName" placeholder="Employee full name" required />
        <input name="employeeId" placeholder="Employee ID (e.g. 1001)" required />
        <input name="activationCode" placeholder="Activation code" required />
        <button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add Employee"}
        </button>
      </form>
      {notice && (
        <p className={notice.type === "success" ? "notice notice-success" : "notice notice-error"}>
          {notice.message}
        </p>
      )}
    </section>
  );
}
