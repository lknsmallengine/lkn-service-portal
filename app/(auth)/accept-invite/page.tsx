import Link from 'next/link';
import { acceptStaffInviteAction, linkStaffAccountAction } from '@/lib/actions';

export default function AcceptInvitePage({ searchParams }: { searchParams?: { token?: string; email?: string; success?: string; error?: string; next?: string } }) {
  const token = searchParams?.token || '';
  const email = searchParams?.email || '';
  const nextPath = searchParams?.next || '/admin';
  return (
    <div className="auth-shell">
      <div className="card" style={{ maxWidth: 860, width: '100%' }}>
        <div className="badge">Build 23</div>
        <h1 style={{ marginBottom: 8 }}>Accept staff invite</h1>
        <p className="subtle">Create or link your staff login using the invite token from the admin team. New staff can finish onboarding here without bouncing between pages.</p>
        {searchParams?.success ? <div className="badge" style={{ marginBottom: 12 }}>Success: {searchParams.success}</div> : null}
        {searchParams?.error ? <div className="badge" style={{ marginBottom: 12, background: '#4a1d1d' }}>Error: {searchParams.error}</div> : null}
        <div className="grid grid-2">
          <form action={acceptStaffInviteAction} className="stack-sm card" style={{ padding: 16 }}>
            <strong>New staff onboarding</strong>
            <label>First name
              <input name="first_name" placeholder="First name" required />
            </label>
            <label>Last name
              <input name="last_name" placeholder="Last name" required />
            </label>
            <label>Email
              <input name="email" type="email" defaultValue={email} placeholder="name@company.com" required />
            </label>
            <label>Invite token
              <input name="invite_token" defaultValue={token} placeholder="invite-xxxxxxx" required />
            </label>
            <input type="hidden" name="next" value={nextPath} />
            </label>
            <label>Password
              <input name="password" type="password" placeholder="Create a password (8+ characters)" />
            </label>
            <input type="hidden" name="next" value={nextPath} />
            <label className="small subtle">After signup you will be sent to login, then into the staff portal.
            </label>
            <button className="btn" type="submit">Accept invite and create staff login</button>
          </form>

          <form action={linkStaffAccountAction} className="stack-sm card" style={{ padding: 16 }}>
            <strong>Already signed in?</strong>
            <label>Email
              <input name="email" type="email" defaultValue={email} placeholder="name@company.com" required />
            </label>
            <label>Invite token
              <input name="invite_token" defaultValue={token} placeholder="invite-xxxxxxx" required />
            </label>
            <input type="hidden" name="next" value={nextPath} />
            </label>
            <button className="btn ghost" type="submit">Link my existing login</button>
          </form>
        </div>
        <div className="small subtle" style={{ marginTop: 12 }}>After you accept the invite, sign in with the same email address and you will land in the staff portal with the correct role. Invite links should use your public app URL in production.</div>
        <div style={{ marginTop: 12 }}>
          <Link href="/login" className="btn ghost">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
