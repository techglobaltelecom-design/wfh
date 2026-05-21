"use server";

import { activateEmployeeAccount, createSession } from "@/lib/auth";
import { normalizeEmployeeId } from "@/lib/employeeId";
import { redirect } from "next/navigation";

export async function activateAction(formData: FormData) {
  const employeeId = normalizeEmployeeId(String(formData.get("employeeId") ?? ""));
  const activationCode = String(formData.get("activationCode") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/activate?error=password");
  }

  const result = await activateEmployeeAccount(employeeId, activationCode, newPassword);
  if (!result.ok) {
    if (result.reason === "ALREADY_ACTIVE") {
      redirect("/activate?error=already-active");
    }
    if (result.reason === "NOT_FOUND") {
      redirect("/activate?error=not-found");
    }
    if (result.reason === "MISSING_CODE") {
      redirect("/activate?error=missing-code");
    }
    redirect("/activate?error=wrong-code");
  }

  await createSession(result.user);
  redirect(result.user.role === "ADMIN" ? "/admin" : "/employee");
}
