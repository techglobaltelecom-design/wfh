import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }

  redirect(session.role === "ADMIN" ? "/admin" : "/employee");
}
