"use server";

import { activateEmployeeAccount, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function activateAction(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const activationCode = String(formData.get("activationCode") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const result = await activateEmployeeAccount(employeeId, activationCode, newPassword);
  if (!result.ok) {
    return { error: "Invalid employee ID or activation code." };
  }

  await createSession(result.user);
  redirect(result.user.role === "ADMIN" ? "/admin" : "/employee");
}
