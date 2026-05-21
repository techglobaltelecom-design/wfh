"use server";

import { createSession, verifyCredentials } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await verifyCredentials(identifier, password);
  if (!result.ok) {
    if (result.reason === "ACTIVATION_REQUIRED") {
      return {
        error:
          "First-time activation required. Use your employee ID in Activate Account."
      };
    }
    return { error: "Invalid employee ID/email or password." };
  }

  await createSession(result.user);
  redirect(result.user.role === "ADMIN" ? "/admin" : "/employee");
}
