import Link from "next/link";
import { activateAction } from "./actions";

export default function ActivatePage() {
  return (
    <main className="container" style={{ maxWidth: 520, marginTop: 80 }}>
      <section className="card grid">
        <h1 className="page-title">First-Time Employee Activation</h1>
        <p className="subtitle">
          Enter your employee ID and one-time activation code, then set your password.
        </p>
        <form action={activateAction} className="grid">
          <label>
            Employee ID
            <input name="employeeId" placeholder="EMP001" required />
          </label>
          <label>
            Activation Code
            <input name="activationCode" required />
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
