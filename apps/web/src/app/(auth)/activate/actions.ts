"use server";

import { activateEmployeeAccount, createSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export async function activateAction(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const activationCode = String(formData.get("activationCode") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/activate?error=password");
  }

  const result = await activateEmployeeAccount(employeeId, activationCode, newPassword);
  if (!result.ok) {
    const existing = await prisma.user.findFirst({ where: { employeeId } });
    if (existing && !existing.requiresActivation) {
      redirect("/activate?error=already-active");
    }
    redirect("/activate?error=invalid");
  }

  await createSession(result.user);
  redirect(result.user.role === "ADMIN" ? "/admin" : "/employee");
}
