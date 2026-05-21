import Link from "next/link";
import { activateAction } from "./actions";

const errorMessages: Record<string, string> = {
  password: "Password must be at least 8 characters.",
  invalid: "Invalid employee ID or activation code. Ask admin for a fresh activation code.",
  "already-active": "This employee is already activated. Use Login instead."
};

export default async function ActivatePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? errorMessages[params.error] : null;

  return (
    <main className="container" style={{ maxWidth: 520, marginTop: 80 }}>
      <section className="card grid">
        <h1 className="page-title">First-Time Employee Activation</h1>
        <p className="subtitle">
          Enter your employee ID and one-time activation code, then set your password.
        </p>
        {error && <p className="notice notice-error">{error}</p>}
        <form action={activateAction} className="grid">
          <label>
            Employee ID
            <input name="employeeId" placeholder="EMP001" required />
          </label>
          <label>
            Activation Code
            <input name="activationCode" placeholder="From admin" required />
          </label>
          <label>
            New Password
            <input type="password" name="newPassword" minLength={8} required />
          </label>
          <button type="submit">Activate & Sign In</button>
        </form>
        <Link href="/login">Back to Login</Link>
      </section>
    </main>
  );
}
