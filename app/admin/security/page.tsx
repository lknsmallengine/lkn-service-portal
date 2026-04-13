import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getLaunchChecks, summarizeLaunchChecks } from '@/lib/env';

function colorForStatus(status: 'ready' | 'missing' | 'warning') {
  if (status === 'ready') return '#17361f';
  if (status === 'missing') return '#4a1d1d';
  return '#4a3815';
}

export default async function SecurityPage() {
  await requireStaff();
  const checks = getLaunchChecks().filter((item) => item.group === 'security');
  const summary = summarizeLaunchChecks(checks);

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="badge">Build 28</div>
          <h1 className="title" style={{ marginTop: 10 }}>Security and permissions pass</h1>
          <p className="small subtle" style={{ maxWidth: 760 }}>
            This page is for verifying the items that commonly block a safe launch: role separation, webhook secrets,
            auth redirects, and launch-time permission checks.
          </p>
        </div>
      </header>

      <section className="grid grid-4" style={{ marginBottom: 16 }}>
        <article className="card"><div className="small subtle">Security score</div><div className="title" style={{ fontSize: 32 }}>{summary.score}%</div></article>
        <article className="card"><div className="small subtle">Ready checks</div><div className="title" style={{ fontSize: 32 }}>{summary.ready}</div></article>
        <article className="card"><div className="small subtle">Required blockers</div><div className="title" style={{ fontSize: 32 }}>{summary.requiredMissing}</div></article>
        <article className="card"><div className="small subtle">Warnings</div><div className="title" style={{ fontSize: 32 }}>{summary.warnings}</div></article>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Role and permission checklist</h2>
        <ul className="small subtle" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
          <li>Customers should only ever see their own equipment, requests, invoices, notifications, and media.</li>
          <li>Service writers and service managers should not be blocked from admin workflow pages.</li>
          <li>Only admins and service managers should edit staff records and security-sensitive settings.</li>
          <li>Webhook routes must reject unsigned or incorrectly signed requests in production.</li>
          <li>Invite tokens must be checked for revocation and expiry before staff linking is allowed.</li>
        </ul>
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/launch">Open launch readiness page</Link>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Security checks</h2>
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
                <td><span className="badge" style={{ background: colorForStatus(check.status), textTransform: 'capitalize' }}>{check.status}</span></td>
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
