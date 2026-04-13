import Link from 'next/link';
import { signUpAction } from '@/lib/actions';

export default function SignupPage({ searchParams }: { searchParams?: { error?: string } }) {
  return (
    <main className="container" style={{ maxWidth: 620 }}>
      <div className="card">
        <div className="badge">Create account</div>
        <h1 className="title" style={{ marginTop: 16 }}>Set up your customer portal</h1>
        {searchParams?.error ? <div className="alert error">{decodeURIComponent(searchParams.error)}</div> : null}
        <form action={signUpAction} className="grid" style={{ marginTop: 18 }}>
          <div className="form-row">
            <div><label>First name</label><input name="first_name" required /></div>
            <div><label>Last name</label><input name="last_name" required /></div>
          </div>
          <div className="form-row">
            <div><label>Email</label><input name="email" type="email" required /></div>
            <div><label>Phone</label><input name="phone" /></div>
          </div>
          <div className="form-row">
            <div><label>Password</label><input name="password" type="password" required minLength={8} /></div>
            <div><label>Confirm password</label><input type="password" disabled value="Matches on next step" readOnly /></div>
          </div>
          <button className="btn" type="submit">Create account</button>
        </form>
        <p className="small" style={{ marginTop: 10 }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent-2)' }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
