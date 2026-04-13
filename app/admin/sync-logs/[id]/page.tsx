import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSyncLogAudits, getSyncLogs } from '@/lib/data';
import { requireStaff } from '@/lib/auth';
import StatusPill from '@/components/StatusPill';

export default async function SyncLogDetailPage({ params }: { params: { id: string } }) {
  await requireStaff();
  const [logs, audits] = await Promise.all([getSyncLogs(), getSyncLogAudits(params.id)]);
  const log = logs.find((item) => item.id === params.id);
  if (!log) return notFound();

  return (
    <main className="container">
      <header className="header">
        <div>
          <div className="badge">Webhook audit detail</div>
          <h1 className="title" style={{ marginTop: 10 }}>Sync log {log.id}</h1>
          <div className="small subtle">Provider: {log.provider} • Event: {log.event_type} • Request: {log.request_number || 'n/a'}</div>
        </div>
        <Link className="btn ghost" href="/admin">Back to admin</Link>
      </header>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="grid grid-4">
          <div><div className="small subtle">Delivery status</div><StatusPill status={log.status} /></div>
          <div><div className="small subtle">Retry state</div><StatusPill status={log.retry_state || 'open'} /></div>
          <div><div className="small subtle">HTTP</div><strong>{typeof log.response_status === 'number' ? log.response_status : '—'}</strong></div>
          <div><div className="small subtle">Retries</div><strong>{typeof log.retry_count === 'number' ? log.retry_count : 0}</strong></div>
        </div>
        <div className="small subtle" style={{ marginTop: 12 }}>Created {new Date(log.created_at).toLocaleString()}{log.last_attempt_at ? ` • Last attempt ${new Date(log.last_attempt_at).toLocaleString()}` : ''}</div>
        {log.error_message ? <div className="card" style={{ padding: 12, marginTop: 12 }}><strong>Error</strong><div className="small subtle" style={{ marginTop: 8 }}>{log.error_message}</div></div> : null}
        {log.dead_letter_note ? <div className="card" style={{ padding: 12, marginTop: 12 }}><strong>Dead-letter note</strong><div className="small subtle" style={{ marginTop: 8 }}>{log.dead_letter_note}</div></div> : null}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Audit trail</h2>
        <table className="table">
          <thead><tr><th>When</th><th>Action</th><th>By</th><th>Note</th></tr></thead>
          <tbody>
            {audits.length ? audits.map((audit) => (
              <tr key={audit.id}>
                <td>{new Date(audit.created_at).toLocaleString()}</td>
                <td>{audit.action}</td>
                <td>{audit.performed_by || 'staff'}</td>
                <td>{audit.note || '—'}</td>
              </tr>
            )) : <tr><td colSpan={4}>No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
