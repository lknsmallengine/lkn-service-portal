import Link from 'next/link';
import { signInAction } from '@/lib/actions';

export default function LoginPage({ searchParams }: { searchParams?: { error?: string } }) {
  return (
    <main className="container" style={{ maxWidth: 520 }}>
      <div className="card">
        <div className="badge">Customer sign in</div>
        <h1 className="title" style={{ marginTop: 16 }}>Welcome back</h1>
        <p className="subtle">Use your customer portal login to track service, approve estimates, and pay invoices.</p>
        {searchParams?.error ? <div className="alert error">{decodeURIComponent(searchParams.error)}</div> : null}
        <form action={signInAction} className="grid" style={{ marginTop: 18 }}>
          <div>
            <label>Email</label>
            <input name="email" type="email" placeholder="customer@example.com" required />
          </div>
          <div>
            <label>Password</label>
            <input name="password" type="password" placeholder="password123" required />
          </div>
          <button className="btn" type="submit">Sign in</button>
        </form>
        <p className="small subtle" style={{ marginTop: 14 }}>
          Demo user: customer@example.com / password123
        </p>
        <p className="small" style={{ marginTop: 10 }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color: 'var(--accent-2)' }}>Create one</Link>
        </p>
      </div>
    </main>
  );
}
