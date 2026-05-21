import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

export async function requireRole(role: "EMPLOYEE" | "ADMIN") {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== role) {
    redirect(session.role === "ADMIN" ? "/admin" : "/employee");
  }
  return session;
}

export async function requireAuth() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }
  return session;
}
