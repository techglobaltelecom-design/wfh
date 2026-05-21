import { loginAction } from "./actions";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  "activation-required":
    "This account is not activated yet. Use Activate Account with your employee ID and one-time code.",
  "invalid-credentials": "Invalid employee ID/email or password."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;

  return (
    <main className="container" style={{ maxWidth: 460, marginTop: 80 }}>
      <section className="card grid">
        <h1 className="page-title">WFH Login</h1>
        <p className="subtitle">Use employee ID or email with your password.</p>
        {error && <p className="notice notice-error">{error}</p>}
        <form action={loginAction} className="grid">
          <label>
            Employee ID or Email
            <input name="identifier" placeholder="EMP001 or employee@company.com" required />
          </label>
          <label>
            Password
            <input type="password" name="password" required />
          </label>
          <button type="submit">Login</button>
        </form>
        <p className="subtitle">
          First-time user? <Link href="/activate">Activate account</Link>
        </p>
        <p className="subtitle">
          Demo activation: Employee ID `EMP001`, code `WELCOME123`
        </p>
      </section>
    </main>
  );
}
