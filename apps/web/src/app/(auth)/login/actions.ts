"use server";

import { createSession, verifyCredentials } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await verifyCredentials(identifier, password);
  if (!result.ok) {
    if (result.reason === "ACTIVATION_REQUIRED") {
      redirect("/login?error=activation-required");
    }
    redirect("/login?error=invalid-credentials");
  }

  await createSession(result.user);
  redirect(result.user.role === "ADMIN" ? "/admin" : "/employee");
}
