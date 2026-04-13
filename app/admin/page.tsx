import Link from 'next/link';

export default function AdminPage() {
  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="badge">Admin operations</div>
          <h1>Admin Dashboard</h1>
          <p className="muted">
            Manage service operations, launches, security, and QA from one place.
          </p>
        </div>
      </header>

      <section className="grid two-col">
        <div className="card">
          <h2>Launch</h2>
          <p className="muted">Review launch readiness and blockers.</p>
          <Link href="/admin/launch" className="button" style={{ marginTop: 12 }}>
            Open launch page
          </Link>
        </div>

        <div className="card">
          <h2>QA</h2>
          <p className="muted">Run smoke tests and validate workflows.</p>
          <Link href="/admin/qa" className="button" style={{ marginTop: 12 }}>
            Open QA workspace
          </Link>
        </div>

        <div className="card">
          <h2>Security</h2>
          <p className="muted">Review permissions, webhook handling, and access.</p>
          <Link href="/admin/security" className="button" style={{ marginTop: 12 }}>
            Open security review
          </Link>
        </div>

        <div className="card">
          <h2>Requests</h2>
          <p className="muted">Access customer requests and service operations.</p>
          <Link href="/dashboard" className="button" style={{ marginTop: 12 }}>
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
