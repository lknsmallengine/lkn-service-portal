import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getLaunchChecks, summarizeLaunchChecks } from '@/lib/env';
import { getQaChecks, summarizeQaChecks } from '@/lib/qa';

function groupTitle(group: string) {
  if (group === 'customer') return 'Customer smoke tests';
  if (group === 'staff') return 'Staff smoke tests';
  if (group === 'integrations') return 'Integration smoke tests';
  return 'Launch verification';
}

export default async function QaLaunchPage() {
  await requireStaff();
  const checks = getLaunchChecks();
  const summary = summarizeLaunchChecks(checks);
  const qaChecks = getQaChecks();
  const qaSummary = summarizeQaChecks(qaChecks);
  const blockers = checks.filter((c) => c.required && c.status !== 'ready');
  const grouped = qaChecks.reduce<Record<string, typeof qaChecks>>((acc, item) => {
    acc[item.group] = acc[item.group] || [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="badge">Build 29</div>
          <h1 className="title" style={{ marginTop: 10 }}>QA + launch pass</h1>
          <p className="small subtle" style={{ maxWidth: 760 }}>
            This page is the final pre-launch workspace. Use it to clear blockers, run smoke tests, and confirm
            the deployment is ready before you point customers to the portal.
          </p>
        </div>
      </header>

      <section className="grid grid-4" style={{ marginBottom: 16 }}>
        <article className="card"><div className="small subtle">Launch score</div><div className="title" style={{ fontSize: 32 }}>{summary.score}%</div></article>
        <article className="card"><div className="small subtle">Required blockers</div><div className="title" style={{ fontSize: 32 }}>{summary.requiredMissing}</div></article>
        <article className="card"><div className="small subtle">QA checks</div><div className="title" style={{ fontSize: 32 }}>{qaSummary.total}</div></article>
        <article className="card"><div className="small subtle">QA groups</div><div className="title" style={{ fontSize: 32 }}>{qaSummary.groups.length}</div></article>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Launch blocker summary</h2>
        {blockers.length === 0 ? (
          <p className="small">No required blockers are showing in the environment review. Run the smoke tests below and then deploy to production.</p>
        ) : (
          <ul className="small subtle" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
            {blockers.map((blocker) => (
              <li key={blocker.key}><strong>{blocker.label}:</strong> {blocker.notes || blocker.status}</li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          <Link href="/admin/launch">Open launch readiness</Link>
          <Link href="/admin/security">Open security review</Link>
          <a href="/api/health" target="_blank">Open health endpoint</a>
        </div>
      </section>

      {Object.entries(grouped).map(([group, items]) => (
        <section key={group} className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>{groupTitle(group)}</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Required</th>
                <th>Path</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.required ? 'Yes' : 'No'}</td>
                  <td className="small">{item.path ? <a href={item.path}>{item.path}</a> : '—'}</td>
                  <td className="small subtle">{item.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Recommended launch sequence</h2>
        <ol className="small subtle" style={{ lineHeight: 1.8, paddingLeft: 18 }}>
          <li>Run <code>npm run verify-env</code> with demo mode disabled.</li>
          <li>Review <code>/admin/launch</code> and clear all required blockers.</li>
          <li>Review <code>/admin/security</code> and confirm staff/customer separation with live accounts.</li>
          <li>Run the customer and staff smoke tests above in your Vercel preview or production environment.</li>
          <li>Check <code>/api/health</code> again after deployment and only then share the portal publicly.</li>
        </ol>
      </section>
    </main>
  );
}
