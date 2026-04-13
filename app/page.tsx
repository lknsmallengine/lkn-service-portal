import Link from 'next/link';
import { AuthStatus } from '@/components/AuthStatus';

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div className="badge">Build 10 • admin notes, status timestamps, customer-linked notifications, outbound webhooks</div>
          <AuthStatus />
        </div>
        <h1 className="title" style={{ marginTop: 16 }}>LKN Service Portal</h1>
        <p className="subtle" style={{ maxWidth: 760 }}>
          This build pushes the operations layer forward with persistent admin notes, status timestamps, outbound webhook delivery helpers for Flyntlok and Zapier, and better separation between customer and admin navigation.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Link className="btn" href="/login">Customer login</Link>
          <Link className="btn secondary" href="/dashboard">Customer dashboard</Link>
          <Link className="btn secondary" href="/admin">Admin operations</Link>
        </div>
      </section>
    </main>
  );
}
