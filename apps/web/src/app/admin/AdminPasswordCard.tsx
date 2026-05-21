"use client";

import { useState } from "react";

interface PasswordResponse {
  ok: boolean;
  error?: string;
  data?: { message?: string };
}

export function AdminPasswordCard() {
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? "")
    };

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as PasswordResponse;

      if (!response.ok || !result.ok) {
        setNotice({
          type: "error",
          message: result.error ?? "Failed to change password."
        });
        return;
      }

      setNotice({
        type: "success",
        message: result.data?.message ?? "Password changed successfully."
      });
      form.reset();
    } catch {
      setNotice({
        type: "error",
        message: "Network error. Try again."
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card">
      <h2 className="section-title">Change Password</h2>
      <form className="grid" onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <input type="password" name="currentPassword" placeholder="Current password" required />
        <input type="password" name="newPassword" placeholder="New password (min 8 chars)" required />
        <input type="password" name="confirmPassword" placeholder="Confirm new password" required />
        <button type="submit" disabled={pending}>
          {pending ? "Updating..." : "Update Password"}
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
