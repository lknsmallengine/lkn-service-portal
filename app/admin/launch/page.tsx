import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getLaunchChecks, summarizeLaunchChecks } from '@/lib/env';

function colorForStatus(status: 'ready' | 'missing' | 'warning') {
  if (status === 'ready') return '#17361f';
  if (status === 'missing') return '#4a1d1d';
  return '#4a3815';
}

export default async function LaunchReadinessPage() {
  await requireStaff();
  const checks = getLaunchChecks();
  const summary = summarizeLaunchChecks(checks);
  const blockers = checks.filter((item) => item.required && item.status !== 'ready');

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="badge">Build 29</div>
          <h1 className="title" style={{ marginTop: 10 }}>Launch readiness</h1>
          <p className="small subtle" style={{ maxWidth: 760 }}>
            This page is the launch-blocker dashboard for the live rollout. Use it to verify environment configuration,
            provider readiness, and the specific items that still need to be cleared before launch.
          </p>
        </div>
      </header>

      <section className="grid grid-4" style={{ marginBottom: 16 }}>
        <article className="card"><div className="small subtle">Readiness score</div><div className="title" style={{ fontSize: 32 }}>{summary.score}%</div></article>
        <article className="card"><div className="small subtle">Ready checks</div><div className="title" style={{ fontSize: 32 }}>{summary.ready}</div></article>
        <article className="card"><div className="small subtle">Required blockers</div><div className="title" style={{ fontSize: 32 }}>{summary.requiredMissing}</div></article>
        <article className="card"><div className="small subtle">Warnings</div><div className="title" style={{ fontSize: 32 }}>{summary.warnings}</div></article>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Required blockers</h2>
        {blockers.length === 0 ? (
          <p className="small">No required blockers are currently flagged. Run the smoke tests on the QA page and validate the deployed environment before launch.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Blocker</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {blockers.map((check) => (
                <tr key={check.key}>
                  <td><strong>{check.label}</strong></td>
                  <td><span className="badge" style={{ background: colorForStatus(check.status), textTransform: 'capitalize' }}>{check.status}</span></td>
                  <td className="small subtle">{check.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          <Link href="/admin/qa">Open QA pass</Link>
          <Link href="/admin/security">Open security pass</Link>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Launch checklist</h2>
        <ul className="small subtle" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
          <li>Set <code>NEXT_PUBLIC_USE_DEMO_DATA=false</code>.</li>
          <li>Load your live Supabase URL, anon key, and service role key.</li>
          <li>Create and confirm the request media storage bucket.</li>
          <li>Set Supabase auth redirect URLs for your live domain, <code>/accept-invite</code>, <code>/dashboard</code>, and <code>/admin</code>.</li>
          <li>Turn on live Resend and Twilio credentials if you want outbound notifications at launch.</li>
          <li>Verify Flyntlok and Zapier endpoint URLs and secrets before enabling sync automation.</li>
        </ul>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Environment and provider checks</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Check</th>
              <th>Status</th>
              <th>Value</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.key}>
                <td>
                  <strong>{check.label}</strong>
                  <div className="small subtle">{check.required ? 'Required' : 'Recommended'}</div>
                </td>
                <td>
                  <span className="badge" style={{ background: colorForStatus(check.status), textTransform: 'capitalize' }}>{check.status}</span>
                </td>
                <td className="small">{check.value || '—'}</td>
                <td className="small subtle">{check.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
