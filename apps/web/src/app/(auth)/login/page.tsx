import { loginAction } from "./actions";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="container" style={{ maxWidth: 460, marginTop: 80 }}>
      <section className="card grid">
        <h1 className="page-title">WFH Login</h1>
        <p className="subtitle">
          Use employee ID or email with your password.
        </p>
        <form action={loginAction} className="grid">
          <label>
            Employee ID or Email
            <input name="identifier" required />
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
